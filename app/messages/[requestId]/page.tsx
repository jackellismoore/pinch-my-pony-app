"use client"

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

  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingStopTimerRef = useRef<number | null>(null)

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)
  const didAutoScrollRef = useRef(false)
  const [isNearBottom, setIsNearBottom] = useState(true)

  const { messages, loadMore, hasMore, loadingMore, loadingInitial, sendOptimistic, retryOptimistic } =
    usePaginatedMessages(requestId)

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

  // ---- Header (horse + other profile) ----
  useEffect(() => {
    if (!requestId || !myUserId) return
    let cancelled = false

    ;(async () => {
      setHeaderLoading(true)

      const { data: req, error: reqErr } = await supabase
        .from("borrow_requests")
        .select("id, horse_id, borrower_id")
        .eq("id", requestId)
        .single()

      if (cancelled) return
      if (reqErr || !req) {
        console.error("Header: borrow_requests error", reqErr)
        setHeader(null)
        setHeaderLoading(false)
        return
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

  // ---- Typing broadcast (single global channel; filtered by requestId) ----
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
      setIsNearBottom(dist < 120)
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
  const lastMsgKey = messages.length ? `${messages[messages.length - 1]!.id}:${messages[messages.length - 1]!.created_at}` : ""
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

  // ---- Read receipts (mark unread as read) ----
  useEffect(() => {
    if (!requestId || !myUserId) return
    if (messages.length === 0) return

    const unreadIds = messages
      .filter((m) => m.sender_id !== myUserId && !m.read_at && !String(m.id).startsWith("temp-"))
      .map((m) => m.id)

    if (unreadIds.length === 0) return

    supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds)
  }, [messages, myUserId, requestId])

  // ---- Group rendering ----
  const grouped = useMemo(() => {
    return messages.map((m, i) => {
      const prev = i > 0 ? messages[i - 1] : null
      const next = i < messages.length - 1 ? messages[i + 1] : null
      return { m, pos: groupPos(prev, m, next) }
    })
  }, [messages])

  // ---- show status only on latest outgoing ----
  const lastOutgoingId = useMemo(() => {
    if (!myUserId) return null
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.sender_id === myUserId) return messages[i]!.id
    }
    return null
  }, [messages, myUserId])

  const retry = async (tempId: string) => {
    await retryOptimistic(tempId)
  }

  const send = async () => {
    if (!myUserId || !requestId) return
    const text = draft.trim()
    if (!text) return

    setDraft("")
    broadcastTyping(false)

    const result = await sendOptimistic(myUserId, text)

    // 🔔 Best-effort push while sender is online
    if (result.ok && otherUserId) {
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

  const statusText =
    otherOnline ? "Online" : otherLastSeenAt ? `Last seen ${timeAgo(otherLastSeenAt)}` : "Offline"

  return (
    <div style={{ height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", background: "#f6f7fb" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderBottom: "1px solid rgba(15,23,42,0.10)",
          background: "white",
          color: "#0f172a",
        }}
      >
        <button
          onClick={() => router.push("/messages")}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: 900,
            color: "#2563eb",
            fontSize: 13,
            padding: "6px 8px",
            borderRadius: 10,
          }}
        >
          ← Back
        </button>

        <div style={{ width: 40, height: 40, borderRadius: 999, overflow: "hidden", background: "rgba(15,23,42,0.06)" }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={otherName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>

        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 900, lineHeight: 1.2, fontSize: 14 }}>
            {headerLoading ? "Loading…" : otherName}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ opacity: 0.75, fontSize: 12, whiteSpace: "nowrap" }}>{horseName}</div>
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
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background:
            "radial-gradient(900px 600px at 20% 10%, rgba(59,130,246,0.12), transparent 60%), radial-gradient(700px 500px at 90% 20%, rgba(14,165,233,0.10), transparent 60%), #f6f7fb",
        }}
      >
        <div ref={topSentinelRef} style={{ height: 1 }} />

        {hasMore && (
          <div style={{ textAlign: "center", opacity: 0.65, fontSize: 12, padding: 8, color: "#0f172a" }}>
            {loadingMore ? "Loading…" : "Scroll up for older messages"}
          </div>
        )}

        {loadingInitial && (
          <div style={{ textAlign: "center", opacity: 0.65, fontSize: 12, padding: 8, color: "#0f172a" }}>
            Loading messages…
          </div>
        )}

        {grouped.map(({ m, pos }) => (
          <MessageBubble
            key={m.id}
            message={m}
            isMine={m.sender_id === myUserId}
            groupPos={pos}
            showStatus={m.sender_id === myUserId && m.id === lastOutgoingId}
            onRetry={(id) => retry(id)}
          />
        ))}

        <TypingBubbleInline show={otherTyping} />
      </div>

      {/* Composer */}
      <div style={{ padding: 12, borderTop: "1px solid rgba(15,23,42,0.10)", background: "white" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={() => broadcastTyping(false)}
            placeholder="Message…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(15,23,42,0.12)",
              background: "rgba(15,23,42,0.03)",
              color: "#0f172a",
              outline: "none",
              lineHeight: 1.35,
              minHeight: 44,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />

          <button
            onClick={send}
            disabled={!draft.trim()}
            style={{
              height: 44,
              padding: "0 14px",
              borderRadius: 12,
              border: "none",
              fontWeight: 900,
              cursor: !draft.trim() ? "not-allowed" : "pointer",
              background: !draft.trim() ? "rgba(37,99,235,0.35)" : "rgba(37,99,235,0.95)",
              color: "white",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
