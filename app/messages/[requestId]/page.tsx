"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { usePaginatedMessages, type UIMessage } from "@/lib/hooks/usePaginatedMessages"
import MessageBubble from "@/components/MessageBubble"
import TypingBubbleInline from "@/components/TypingBubbleInline"

type Profile = {
  id: string
  display_name: string | null
  full_name: string | null
  avatar_url: string | null
  last_seen_at: string | null
}

type OtherUser = {
  id: string
  display_name: string
  avatar_url: string | null
  last_seen_at: string | null
}

type ThreadHeader = {
  horse_name: string
  other_user: OtherUser | null
}

function cleanName(v: string | null | undefined) {
  const s = (v ?? "").trim()
  return s.length ? s : null
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime()
  const now = Date.now()
  const sec = Math.max(1, Math.floor((now - t) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return new Date(iso).toLocaleString()
}

// grouping: same sender within 5 minutes
function sameGroup(a: UIMessage, b: UIMessage) {
  if (a.sender_id !== b.sender_id) return false
  const dt = Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return dt <= 5 * 60 * 1000
}

function groupPos(prev: UIMessage | null, cur: UIMessage, next: UIMessage | null) {
  const prevSame = prev ? sameGroup(prev, cur) : false
  const nextSame = next ? sameGroup(cur, next) : false
  if (!prevSame && !nextSame) return "single" as const
  if (!prevSame && nextSame) return "start" as const
  if (prevSame && nextSame) return "middle" as const
  return "end" as const
}

function dateKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()

  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dd = startOf(d)
  const nn = startOf(now)

  const diffDays = Math.round((nn - dd) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])
const SEND_COOLDOWN_MS = 800

export default function MessageThreadPage() {
  const router = useRouter()

  const params = useParams() as Record<string, string | string[] | undefined>
  const requestIdRaw = params.requestId ?? params.requestid
  const requestId = Array.isArray(requestIdRaw) ? requestIdRaw[0] : (requestIdRaw ?? "")

  const [authLoading, setAuthLoading] = useState(true)
  const [myUserId, setMyUserId] = useState<string | null>(null)

  const [header, setHeader] = useState<ThreadHeader | null>(null)
  const [headerLoading, setHeaderLoading] = useState(true)

  const [otherOnline, setOtherOnline] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [otherLastSeenAt, setOtherLastSeenAt] = useState<string | null>(null)

  // review eligibility state
  const [requestStatus, setRequestStatus] = useState<string | null>(null)
  const [isBorrower, setIsBorrower] = useState(false)
  const [reviewExists, setReviewExists] = useState(false)

  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // attachment UI
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [pickedPreviewUrl, setPickedPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const lastSendAtRef = useRef<number>(0)

  // ✅ NEW: "New messages" divider anchor (sticky for this page session)
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null)
  const [firstUnreadCount, setFirstUnreadCount] = useState<number>(0)

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingStopTimerRef = useRef<number | null>(null)

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)
  const didAutoScrollRef = useRef(false)
  const [isNearBottom, setIsNearBottom] = useState(true)

  const {
    messages,
    loadMore,
    hasMore,
    loadingMore,
    loadingInitial,
    sendOptimistic,
    sendOptimisticWithImage,
    retryOptimistic,
  } = usePaginatedMessages(requestId)

  // ---- Auth ----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setAuthLoading(true)
      const { data, error } = await supabase.auth.getUser()
      if (cancelled) return
      if (error || !data?.user) {
        setMyUserId(null)
        setAuthLoading(false)
        return
      }
      setMyUserId(data.user.id)
      setAuthLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ---- Header (horse + other profile) + review eligibility ----
  useEffect(() => {
    if (!requestId || !myUserId) return
    let cancelled = false

    ;(async () => {
      setHeaderLoading(true)

      const { data: req, error: reqErr } = await supabase
        .from("borrow_requests")
        .select("id, horse_id, borrower_id, status")
        .eq("id", requestId)
        .single()

      if (cancelled) return
      if (reqErr || !req) {
        console.error("Header: borrow_requests error", reqErr)
        setHeader(null)
        setHeaderLoading(false)
        return
      }

      setRequestStatus(req.status ?? null)
      setIsBorrower(req.borrower_id === myUserId)

      // check existing review (only for borrower UX; RLS also enforces)
      if (req.borrower_id === myUserId) {
        const { data: existing, error: exErr } = await supabase
          .from("reviews")
          .select("id")
          .eq("request_id", requestId)
          .eq("borrower_id", myUserId)
          .maybeSingle()

        if (!cancelled) {
          if (exErr) setReviewExists(true)
          else setReviewExists(Boolean(existing?.id))
        }
      } else {
        setReviewExists(true) // not borrower => hide CTA
      }

      const { data: horse, error: horseErr } = await supabase
        .from("horses")
        .select("id, name, owner_id")
        .eq("id", req.horse_id)
        .single()

      if (cancelled) return
      if (horseErr || !horse) {
        console.error("Header: horses error", horseErr)
        setHeader(null)
        setHeaderLoading(false)
        return
      }

      const otherId: string = horse.owner_id === myUserId ? req.borrower_id : horse.owner_id

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, display_name, full_name, avatar_url, last_seen_at")
        .eq("id", otherId)
        .maybeSingle()

      if (cancelled) return

      const p = prof as Profile | null
      const display = cleanName(p?.display_name) || cleanName(p?.full_name) || "User"

      setOtherLastSeenAt(p?.last_seen_at ?? null)

      setHeader({
        horse_name: horse.name,
        other_user: {
          id: otherId,
          display_name: display,
          avatar_url: p?.avatar_url ?? null,
          last_seen_at: p?.last_seen_at ?? null,
        },
      })

      setHeaderLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [requestId, myUserId])

  const otherUserId = header?.other_user?.id ?? null

  // ---- Presence online indicator ----
  useEffect(() => {
    if (!requestId || !myUserId) return

    const channel = supabase.channel(`presence:thread:${requestId}`, {
      config: { presence: { key: myUserId } },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>
        let online = false
        for (const key of Object.keys(state)) {
          for (const meta of state[key] ?? []) {
            const uid = meta.user_id ?? key
            if (uid && uid !== myUserId) online = true
          }
        }
        setOtherOnline(online)
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return
        await channel.track({ user_id: myUserId })
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, myUserId])

  // ---- Typing broadcast (global channel; filter by requestId) ----
  useEffect(() => {
    if (!myUserId) return

    const ch = supabase
      .channel("typing:threads", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (event) => {
        const { request_id, user_id, typing } = (event.payload ?? {}) as {
          request_id?: string
          user_id?: string
          typing?: boolean
        }
        if (!request_id || request_id !== requestId) return
        if (!user_id || user_id === myUserId) return
        setOtherTyping(Boolean(typing))
      })
      .subscribe()

    typingChannelRef.current = ch

    return () => {
      typingChannelRef.current = null
      supabase.removeChannel(ch)
    }
  }, [myUserId, requestId])

  const broadcastTyping = (typing: boolean) => {
    const ch = typingChannelRef.current
    if (!ch || !myUserId || !requestId) return
    ch.send({
      type: "broadcast",
      event: "typing",
      payload: { request_id: requestId, user_id: myUserId, typing },
    })
  }

  const onDraftChange = (val: string) => {
    setDraft(val)
    broadcastTyping(true)
    if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current)
    typingStopTimerRef.current = window.setTimeout(() => broadcastTyping(false), 650)
  }

  useEffect(() => {
    return () => {
      broadcastTyping(false)
      if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Infinite scroll (older messages) ----
  useEffect(() => {
    const sentinel = topSentinelRef.current
    const scroller = scrollerRef.current
    if (!sentinel || !scroller) return

    const obs = new IntersectionObserver(
      async (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        if (!hasMore || loadingMore) return

        const prevScrollHeight = scroller.scrollHeight
        const prevScrollTop = scroller.scrollTop

        await loadMore()

        requestAnimationFrame(() => {
          scroller.scrollTop = prevScrollTop + (scroller.scrollHeight - prevScrollHeight)
        })
      },
      { root: scroller, threshold: 0.1 }
    )

    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loadMore])

  // ---- near-bottom detection ----
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const onScroll = () => {
      const dist = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight)
      setIsNearBottom(dist < 140)
    }
    onScroll()
    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => scroller.removeEventListener("scroll", onScroll)
  }, [])

  // ---- initial autoscroll ----
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (loadingInitial) return
    if (didAutoScrollRef.current) return
    didAutoScrollRef.current = true
    requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight
    })
  }, [loadingInitial])

  // ---- autoscroll on new messages if near bottom ----
  const lastMsgKey = messages.length
    ? `${messages[messages.length - 1]!.id}:${messages[messages.length - 1]!.created_at}`
    : ""
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (!didAutoScrollRef.current) return
    if (!isNearBottom) return
    requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight
    })
  }, [lastMsgKey, isNearBottom])

  // ---- autofocus input ----
  useEffect(() => {
    if (!myUserId) return
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [myUserId, requestId])

  // ✅ Read receipts (throttled + deduped)
  const unreadIds = useMemo(() => {
    if (!myUserId) return []
    return messages
      .filter((m) => m.sender_id !== myUserId && !m.read_at && !String(m.id).startsWith("temp-"))
      .map((m) => m.id)
  }, [messages, myUserId])

  const unreadKey = useMemo(() => unreadIds.join("|"), [unreadIds])

  // ✅ NEW: lock the first unread message ONCE (divider stays even after read_at updates)
  useEffect(() => {
    if (!myUserId) return
    if (firstUnreadId) return
    if (!messages.length) return

    const unread = messages.filter(
      (m) => m.sender_id !== myUserId && !m.read_at && !String(m.id).startsWith("temp-")
    )
    if (!unread.length) return

    setFirstUnreadId(unread[0]!.id)
    setFirstUnreadCount(unread.length)
  }, [messages, myUserId, firstUnreadId])

  const lastMarkedKeyRef = useRef<string>("")
  const inFlightRef = useRef(false)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!requestId || !myUserId) return
    if (!unreadKey) return
    if (document.visibilityState !== "visible") return
    if (unreadKey === lastMarkedKeyRef.current) return

    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      if (inFlightRef.current) return
      inFlightRef.current = true

      try {
        const idsNow = unreadIds
        if (idsNow.length === 0) return

        const { error } = await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", idsNow)
        if (error) {
          console.error("mark read error:", error)
          return
        }
        lastMarkedKeyRef.current = unreadKey
      } finally {
        inFlightRef.current = false
      }
    }, 250)

    const onVis = () => {
      if (document.visibilityState === "visible") lastMarkedKeyRef.current = ""
    }

    document.addEventListener("visibilitychange", onVis)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [unreadKey, unreadIds, myUserId, requestId])

  // ---- Group rendering ----
  const grouped = useMemo(() => {
    return messages.map((m, i) => {
      const prev = i > 0 ? messages[i - 1] : null
      const next = i < messages.length - 1 ? messages[i + 1] : null
      return { m, pos: groupPos(prev, m, next) }
    })
  }, [messages])

  const retry = async (tempId: string) => {
    await retryOptimistic(tempId)
  }

  // ✅ Delete chat (hide for current user only)
  const [deleting, setDeleting] = useState(false)
  const deleteChatForMe = async () => {
    if (!myUserId || !requestId) return
    const ok = window.confirm("Delete this chat for you? It will reappear if a new message is sent.")
    if (!ok) return

    setDeleting(true)

    const { error } = await supabase
      .from("message_thread_deletions")
      .upsert(
        {
          user_id: myUserId,
          request_id: requestId,
          deleted_at: new Date().toISOString(),
        },
        { onConflict: "user_id,request_id" }
      )

    setDeleting(false)

    if (error) {
      console.error("deleteChatForMe error:", error)
      alert("Could not delete chat: " + error.message)
      return
    }

    router.push("/messages")
    router.refresh()
  }

  // attachment picking
  const clearPicked = () => {
    setComposerError(null)
    setPickedFile(null)
    if (pickedPreviewUrl) URL.revokeObjectURL(pickedPreviewUrl)
    setPickedPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  useEffect(() => {
    return () => {
      if (pickedPreviewUrl) URL.revokeObjectURL(pickedPreviewUrl)
    }
  }, [pickedPreviewUrl])

  const onPickFile = (file: File | null) => {
    setComposerError(null)
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setComposerError("Please choose a JPG, PNG, or WebP image.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setComposerError("That image is too large. Max size is 5MB.")
      return
    }

    if (pickedPreviewUrl) URL.revokeObjectURL(pickedPreviewUrl)
    setPickedFile(file)
    setPickedPreviewUrl(URL.createObjectURL(file))
  }

  const canSend = useMemo(() => {
    const hasText = Boolean(draft.trim())
    const hasImg = Boolean(pickedFile)
    if (!hasText && !hasImg) return false
    if (uploading) return false
    return true
  }, [draft, pickedFile, uploading])

  const send = async () => {
    if (!myUserId || !requestId) return
    setComposerError(null)

    const now = Date.now()
    if (now - lastSendAtRef.current < SEND_COOLDOWN_MS) return
    lastSendAtRef.current = now

    const text = draft.trim()
    const file = pickedFile
    if (!text && !file) return

    setDraft("")
    broadcastTyping(false)

    if (file) {
      setUploading(true)
      const fallbackText = text || "📷 Photo"

      const result = await sendOptimisticWithImage(myUserId, fallbackText, file, { bucket: "message-attachments" })
      setUploading(false)

      if (!result.ok) {
        setComposerError(`Couldn’t send image: ${result.errorMessage ?? "Unknown error"}`)
        return
      }

      clearPicked()

      if (otherUserId && !otherOnline) {
        fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: otherUserId,
            title: "New message",
            body: text ? text : "Sent a photo",
            url: `/messages/${requestId}`,
          }),
        }).catch(() => {})
      }

      const scroller = scrollerRef.current
      if (scroller) requestAnimationFrame(() => (scroller.scrollTop = scroller.scrollHeight))
      return
    }

    const result = await sendOptimistic(myUserId, text)
    if (!result.ok) {
      setComposerError(`Couldn’t send message: ${result.errorMessage ?? "Unknown error"}`)
      return
    }

    if (otherUserId && !otherOnline) {
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: otherUserId,
          title: "New message",
          body: text,
          url: `/messages/${requestId}`,
        }),
      }).catch(() => {})
    }

    const scroller = scrollerRef.current
    if (scroller) requestAnimationFrame(() => (scroller.scrollTop = scroller.scrollHeight))
  }

  if (!requestId) return <div style={{ padding: 20 }}>Missing requestId in URL</div>
  if (authLoading) return <div style={{ padding: 20, opacity: 0.75 }}>Loading session…</div>
  if (!myUserId) return <div style={{ padding: 20 }}>You’re not logged in.</div>

  const otherName = header?.other_user?.display_name ?? "User"
  const horseName = header?.horse_name ?? ""
  const avatarUrl = header?.other_user?.avatar_url ?? ""

  const statusText = otherOnline ? "Online" : otherLastSeenAt ? `Last seen ${timeAgo(otherLastSeenAt)}` : "Offline"
  const showReviewCTA = isBorrower && requestStatus === "approved" && !reviewExists

  return (
    <div style={{ height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", background: "#f6f7fb" }}>
      {/* Header */}
      <div
        className="pmp-chatHeader"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderBottom: "1px solid rgba(15,23,42,0.10)",
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(10px)",
          color: "#0f172a",
        }}
      >
        <button
          onClick={() => router.push("/messages")}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: 950,
            color: "#0b3b2e",
            fontSize: 13,
            padding: "6px 10px",
            borderRadius: 12,
          }}
          className="pmp-hoverLift"
        >
          ← Back
        </button>

        {showReviewCTA ? (
          <Link
            href={`/review/${requestId}`}
            style={{
              border: "1px solid rgba(15,23,42,0.12)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(245,241,232,0.78))",
              color: "#0f172a",
              padding: "6px 10px",
              borderRadius: 12,
              fontWeight: 950,
              fontSize: 12,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
            className="pmp-hoverLift"
          >
            Leave a review →
          </Link>
        ) : null}

        <button
          onClick={deleteChatForMe}
          disabled={deleting}
          style={{
            marginLeft: 2,
            border: "1px solid rgba(239,68,68,0.25)",
            background: deleting ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.10)",
            color: "#b91c1c",
            cursor: deleting ? "not-allowed" : "pointer",
            fontWeight: 950,
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 12,
          }}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            overflow: "hidden",
            background: "rgba(15,23,42,0.06)",
            border: "2px solid rgba(202,162,77,0.35)",
            boxShadow: "0 10px 20px rgba(15,23,42,0.10)",
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={otherName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>

        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 950, lineHeight: 1.15, fontSize: 14 }}>
            {headerLoading ? "Loading…" : otherName}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ opacity: 0.78, fontSize: 12, whiteSpace: "nowrap", color: "#0b3b2e", fontWeight: 850 }}>
              {horseName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.85 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: otherOnline ? "#22c55e" : "rgba(15,23,42,0.25)",
                  display: "inline-block",
                }}
              />
              {statusText}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="pmp-chatScroller"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          position: "relative",
          background:
            "radial-gradient(1000px 680px at 12% 6%, rgba(202,162,77,0.14), transparent 60%), radial-gradient(1000px 680px at 92% 10%, rgba(11,59,46,0.10), transparent 60%), linear-gradient(180deg, rgba(245,241,232,0.88), rgba(250,250,250,0.96))",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.18), transparent 25%, rgba(255,255,255,0.14)), radial-gradient(1200px 600px at 50% 0%, rgba(15,23,42,0.04), transparent 60%)",
            mixBlendMode: "soft-light",
          }}
        />

        <div ref={topSentinelRef} style={{ height: 1, position: "relative" }} />

        {hasMore && (
          <div style={{ textAlign: "center", opacity: 0.65, fontSize: 12, padding: 8, color: "#0f172a", position: "relative" }}>
            {loadingMore ? "Loading…" : "Scroll up for older messages"}
          </div>
        )}

        {loadingInitial && (
          <div style={{ textAlign: "center", opacity: 0.65, fontSize: 12, padding: 8, color: "#0f172a", position: "relative" }}>
            Loading messages…
          </div>
        )}

        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
          {grouped.map(({ m, pos }, idx) => {
            const prev = idx > 0 ? grouped[idx - 1]!.m : null
            const showDaySeparator = !prev || dateKey(prev.created_at) !== dateKey(m.created_at)
            const showNewDivider = firstUnreadId && m.id === firstUnreadId

            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {showDaySeparator ? (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 950,
                        color: "rgba(15,23,42,0.72)",
                        padding: "6px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(15,23,42,0.10)",
                        background: "rgba(255,255,255,0.66)",
                        boxShadow: "0 10px 18px rgba(15,23,42,0.06)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {dayLabel(m.created_at)}
                    </div>
                  </div>
                ) : null}

                {showNewDivider ? (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 950,
                        color: "rgba(15,23,42,0.78)",
                        padding: "7px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(202,162,77,0.38)",
                        background:
                          "radial-gradient(600px 160px at 15% 0%, rgba(202,162,77,0.20), transparent 60%), rgba(255,255,255,0.72)",
                        boxShadow: "0 10px 18px rgba(15,23,42,0.06)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      New messages{firstUnreadCount > 0 ? ` (${firstUnreadCount})` : ""}
                    </div>
                  </div>
                ) : null}

                <MessageBubble
                  message={m}
                  isMine={m.sender_id === myUserId}
                  groupPos={pos}
                  showStatus={false}
                  onRetry={(id) => retry(id)}
                />
              </div>
            )
          })}

          <TypingBubbleInline show={otherTyping} />
        </div>
      </div>

      {/* Composer */}
      <div
        className="pmp-chatComposer"
        style={{
          padding: 12,
          borderTop: "1px solid rgba(15,23,42,0.10)",
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(10px)",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />

        {pickedFile && pickedPreviewUrl ? (
          <div
            className="pmp-hoverLift"
            style={{
              marginBottom: 10,
              border: "1px solid rgba(15,23,42,0.10)",
              borderRadius: 18,
              background:
                "radial-gradient(700px 180px at 10% 0%, rgba(202,162,77,0.16), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,241,232,0.78))",
              boxShadow: "0 14px 40px rgba(15,23,42,0.10)",
              padding: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(15,23,42,0.12)",
                background: "rgba(15,23,42,0.04)",
                flex: "0 0 auto",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pickedPreviewUrl} alt="Selected" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 950,
                  fontSize: 13,
                  color: "#0f172a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {pickedFile.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.72, color: "#0f172a", marginTop: 2 }}>
                {(pickedFile.size / 1024 / 1024).toFixed(2)} MB • {pickedFile.type || "image"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.80, color: "#0b3b2e", marginTop: 4, fontWeight: 850 }}>
                {uploading ? "Uploading…" : "Ready to send"}
              </div>
            </div>

            <button
              onClick={clearPicked}
              disabled={uploading}
              style={{
                border: "1px solid rgba(239,68,68,0.25)",
                background: uploading ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.10)",
                color: "#b91c1c",
                cursor: uploading ? "not-allowed" : "pointer",
                fontWeight: 950,
                fontSize: 12,
                padding: "8px 10px",
                borderRadius: 14,
                flex: "0 0 auto",
              }}
            >
              Remove
            </button>
          </div>
        ) : null}

        {composerError ? (
          <div style={{ marginBottom: 10, fontSize: 12, color: "#b91c1c", fontWeight: 950, whiteSpace: "pre-wrap" }}>
            {composerError}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="pmp-hoverLift"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(245,241,232,0.78))",
              cursor: uploading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
              padding: 0,
            }}
            title="Attach image"
            aria-label="Attach image"
          >
            <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true">
              📷
            </span>
          </button>

          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={() => broadcastTyping(false)}
            placeholder={pickedFile ? "Add a caption (optional)…" : "Message…"}
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              padding: "12px 12px",
              borderRadius: 16,
              border: "1px solid rgba(15,23,42,0.12)",
              background: "rgba(15,23,42,0.03)",
              color: "#0f172a",
              outline: "none",
              lineHeight: 1.35,
              minHeight: 44,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (canSend) void send()
              }
            }}
            disabled={uploading}
          />

          <button
            onClick={() => void send()}
            disabled={!canSend}
            className={!canSend ? "" : "pmp-hoverLift"}
            style={{
              height: 44,
              padding: "0 14px",
              borderRadius: 16,
              border: "1px solid rgba(15,23,42,0.12)",
              fontWeight: 950,
              cursor: !canSend ? "not-allowed" : "pointer",
              background: !canSend
                ? "rgba(11,59,46,0.18)"
                : "linear-gradient(180deg, rgba(11,59,46,0.96), rgba(15,23,42,0.92))",
              color: "white",
              boxShadow: !canSend ? "none" : "0 14px 30px rgba(15,23,42,0.18)",
            }}
            title={uploading ? "Uploading…" : "Send"}
          >
            {uploading ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  )
}