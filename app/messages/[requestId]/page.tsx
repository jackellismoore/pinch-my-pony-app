"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { usePaginatedMessages } from "@/lib/hooks/usePaginatedMessages"
import MessageBubble from "@/components/MessageBubble"
import TypingBubbleInline from "@/components/TypingBubbleInline"

type Profile = {
  id: string
  display_name: string | null
  full_name: string | null
  avatar_url: string | null
}

type OtherUser = {
  id: string
  display_name: string
  avatar_url: string | null
}

type ThreadHeader = {
  horse_name: string
  other_user: OtherUser | null
}

type AnyMsg = {
  id: string
  request_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  client_status?: "pending" | "sent" | "error"
}

function cleanName(v: string | null | undefined) {
  const s = (v ?? "").trim()
  return s.length ? s : null
}

// grouping: same sender within 5 minutes
function sameGroup(a: AnyMsg, b: AnyMsg) {
  if (a.sender_id !== b.sender_id) return false
  const dt = Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return dt <= 5 * 60 * 1000
}

function groupPos(prev: AnyMsg | null, cur: AnyMsg, next: AnyMsg | null) {
  const prevSame = prev ? sameGroup(prev, cur) : false
  const nextSame = next ? sameGroup(cur, next) : false
  if (!prevSame && !nextSame) return "single" as const
  if (!prevSame && nextSame) return "start" as const
  if (prevSame && nextSame) return "middle" as const
  return "end" as const
}

export default function MessageThreadPage() {
  const router = useRouter()

  // supports requestId (correct) and requestid (in case anything passes it wrong)
  const params = useParams() as Record<string, string | string[] | undefined>
  const requestIdRaw = params.requestId ?? params.requestid
  const requestId = Array.isArray(requestIdRaw) ? requestIdRaw[0] : (requestIdRaw ?? "")

  // Auth/session
  const [authLoading, setAuthLoading] = useState(true)
  const [myUserId, setMyUserId] = useState<string | null>(null)

  // Header data
  const [header, setHeader] = useState<ThreadHeader | null>(null)
  const [headerLoading, setHeaderLoading] = useState(true)

  // Presence + typing
  const [otherOnline, setOtherOnline] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)

  // Composer
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingStopTimerRef = useRef<number | null>(null)

  // Scroll + infinite load
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)
  const didAutoScrollRef = useRef(false)

  // Messages hook
  const { messages, loadMore, hasMore, loadingMore, loadingInitial } = usePaginatedMessages(requestId)
  const msgs = messages as AnyMsg[]

  // Track “am I near bottom?” so we only autoscroll when user is at bottom
  const [isNearBottom, setIsNearBottom] = useState(true)

  // ----- Auth load (no silent redirect) -----
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

  // ----- Header fetch (horse + other profile) -----
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

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", otherId)
        .maybeSingle()

      if (cancelled) return
      if (profErr) console.error("Header: profiles error", profErr)

      const display =
        cleanName((prof as Profile | null)?.display_name) ||
        cleanName((prof as Profile | null)?.full_name) ||
        "User"

      setHeader({
        horse_name: horse.name,
        other_user: { id: otherId, display_name: display, avatar_url: (prof as Profile | null)?.avatar_url ?? null },
      })

      setHeaderLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [requestId, myUserId])

  // ----- Presence (online indicator) -----
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

  // ----- Typing broadcast (works reliably) -----
  useEffect(() => {
    if (!requestId || !myUserId) return

    const typingChannel = supabase
      .channel(`typing:thread:${requestId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (event) => {
        const { user_id, typing } = (event.payload ?? {}) as { user_id?: string; typing?: boolean }
        if (!user_id || user_id === myUserId) return
        setOtherTyping(Boolean(typing))
      })
      .subscribe()

    typingChannelRef.current = typingChannel

    return () => {
      typingChannelRef.current = null
      supabase.removeChannel(typingChannel)
    }
  }, [requestId, myUserId])

  const broadcastTyping = (typing: boolean) => {
    const ch = typingChannelRef.current
    if (!ch || !myUserId) return
    ch.send({ type: "broadcast", event: "typing", payload: { user_id: myUserId, typing } })
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

  // ----- Infinite scroll older with anchor -----
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

  // ----- Track near-bottom -----
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const onScroll = () => {
      const distanceFromBottom = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight)
      setIsNearBottom(distanceFromBottom < 120)
    }

    onScroll()
    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => scroller.removeEventListener("scroll", onScroll)
  }, [])

  // ----- Auto-scroll once after initial load -----
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

  // ----- Auto-scroll on new messages only if user is near bottom -----
  const lastMsgKey = msgs.length ? `${msgs[msgs.length - 1]!.id}:${msgs[msgs.length - 1]!.created_at}` : ""
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (!didAutoScrollRef.current) return
    if (!isNearBottom) return

    requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight
    })
  }, [lastMsgKey, isNearBottom])

  // ----- Autofocus composer once auth + thread ready -----
  useEffect(() => {
    if (!myUserId) return
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [myUserId, requestId])

  // ----- Mark unread as read -----
  useEffect(() => {
    if (!requestId || !myUserId) return
    if (msgs.length === 0) return

    const unreadIds = msgs
      .filter((m) => m.sender_id !== myUserId && !m.read_at && !String(m.id).startsWith("temp-"))
      .map((m) => m.id)

    if (unreadIds.length === 0) return

    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(({ error }) => {
        if (error) console.error("mark read error:", error)
      })
  }, [msgs, myUserId, requestId])

  // ----- Grouped rendering -----
  const grouped = useMemo(() => {
    return msgs.map((m, i) => {
      const prev = i > 0 ? msgs[i - 1] : null
      const next = i < msgs.length - 1 ? msgs[i + 1] : null
      return { m, pos: groupPos(prev, m, next) }
    })
  }, [msgs])

  // ----- Send message -----
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!myUserId || !requestId) return
    const text = draft.trim()
    if (!text || sending) return

    setSending(true)
    setDraft("")
    broadcastTyping(false)

    const { error } = await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: myUserId,
      content: text,
    })

    setSending(false)

    if (error) {
      console.error("send error:", error)
      setDraft(text)
      return
    }

    // keep it snappy after send
    const scroller = scrollerRef.current
    if (scroller) requestAnimationFrame(() => (scroller.scrollTop = scroller.scrollHeight))
  }

  // ----- Render guards -----
  if (!requestId) {
    return <div style={{ padding: 20 }}>Missing requestId in URL</div>
  }

  if (authLoading) {
    return <div style={{ padding: 20, opacity: 0.75 }}>Loading session…</div>
  }

  if (!myUserId) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>You’re not logged in</div>
        <a href="/login" style={{ color: "#2563eb", fontWeight: 900 }}>
          Go to Login
        </a>
      </div>
    )
  }

  const otherName = header?.other_user?.display_name ?? "User"
  const horseName = header?.horse_name ?? ""
  const avatarUrl = header?.other_user?.avatar_url ?? ""

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
        {/* Back button */}
        <button
          onClick={() => {
            if (window.history.length > 1) router.back()
            else router.push("/messages")
          }}
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
          aria-label="Back to messages"
        >
          ← Back
        </button>

        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            overflow: "hidden",
            background: "rgba(15,23,42,0.06)",
            flexShrink: 0,
          }}
        >
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
              {otherOnline ? "Online" : "Offline"}
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
          <MessageBubble key={m.id} message={m} isMine={m.sender_id === myUserId} groupPos={pos} />
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
            disabled={!draft.trim() || sending}
            style={{
              height: 44,
              padding: "0 14px",
              borderRadius: 12,
              border: "none",
              fontWeight: 900,
              cursor: !draft.trim() || sending ? "not-allowed" : "pointer",
              background: !draft.trim() || sending ? "rgba(37,99,235,0.35)" : "rgba(37,99,235,0.95)",
              color: "white",
            }}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  )
}
