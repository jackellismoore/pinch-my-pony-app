"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { usePaginatedMessages, type Message } from "@/lib/hooks/usePaginatedMessages"
import MessageBubble from "@/components/MessageBubble"
import TypingBubbleInline from "@/components/TypingBubbleInline"

type Profile = {
  id: string
  display_name: string | null
  full_name: string | null
  avatar_url: string | null
}

type OtherUser = { id: string; display_name: string; avatar_url: string | null }
type ThreadHeader = { horse_name: string; other_user: OtherUser | null }

function cleanName(v: string | null | undefined) {
  const s = (v ?? "").trim()
  return s.length ? s : null
}

export default function MessageThreadPage() {
  const router = useRouter()
  const params = useParams() as { requestId?: string }
  const requestId = params?.requestId ?? ""

  const { messages, loadMore, hasMore, loadingMore, loadingInitial } =
    usePaginatedMessages(requestId)

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)

  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [header, setHeader] = useState<ThreadHeader | null>(null)
  const [headerLoading, setHeaderLoading] = useState(true)

  const [otherOnline, setOtherOnline] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)

  // Composer
  const [draft, setDraft] = useState("")
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingStopTimerRef = useRef<number | null>(null)

  // --- Auth ---
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (cancelled) return
      if (error || !data?.user) {
        router.push("/login")
        return
      }
      setMyUserId(data.user.id)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  // --- Header (horse + other profile) ---
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

      const otherId: string =
        horse.owner_id === myUserId ? req.borrower_id : horse.owner_id

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, full_name, avatar_url")
        .eq("id", otherId)
        .maybeSingle()

      if (cancelled) return

      if (profErr) {
        console.error("Header: profiles SELECT blocked/error", {
          code: (profErr as any)?.code,
          message: (profErr as any)?.message,
          details: (profErr as any)?.details,
          hint: (profErr as any)?.hint,
          otherId,
        })
      }

      // ✅ Strong fallback: display_name -> full_name -> "User"
      const display =
        cleanName((prof as Profile | null)?.display_name) ||
        cleanName((prof as Profile | null)?.full_name) ||
        "User"

      setHeader({
        horse_name: horse.name,
        other_user: {
          id: otherId,
          display_name: display,
          avatar_url: (prof as Profile | null)?.avatar_url ?? null,
        },
      })

      setHeaderLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [requestId, myUserId])

  // --- Presence online indicator ---
  useEffect(() => {
    if (!requestId || !myUserId) return

    const channel = supabase.channel(`presence:thread:${requestId}`, {
      config: { presence: { key: myUserId } },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ user_id?: string }>
        >
        let online = false
        for (const key of Object.keys(state)) {
          const metas = state[key] ?? []
          for (const meta of metas) {
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

  // --- Typing channel (FIXED: event.payload) ---
  useEffect(() => {
    if (!requestId || !myUserId) return

    const typingChannel = supabase
      .channel(`typing:thread:${requestId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "typing" }, (event) => {
        const { user_id, typing } = (event.payload ?? {}) as {
          user_id?: string
          typing?: boolean
        }
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
    ch.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: myUserId, typing },
    })
  }

  const onDraftChange = (val: string) => {
    setDraft(val)

    broadcastTyping(true)

    if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current)
    typingStopTimerRef.current = window.setTimeout(() => {
      broadcastTyping(false)
    }, 650)
  }

  useEffect(() => {
    return () => {
      broadcastTyping(false)
      if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Infinite scroll + anchor ---
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
          const newScrollHeight = scroller.scrollHeight
          scroller.scrollTop =
            prevScrollTop + (newScrollHeight - prevScrollHeight)
        })
      },
      { root: scroller, threshold: 0.1 }
    )

    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loadMore])

  // --- Auto-scroll once after initial load ---
  const didAutoScrollRef = useRef(false)
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

  // --- Mark unread as read ---
  useEffect(() => {
    if (!requestId || !myUserId) return
    if (messages.length === 0) return

    const unreadIds = messages
      .filter((m) => m.sender_id !== myUserId && !m.read_at)
      .map((m) => m.id)

    if (unreadIds.length === 0) return

    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(({ error }) => {
        if (error) console.error("mark read error:", error)
      })
  }, [messages, myUserId, requestId])

  // --- Send message ---
  const send = async () => {
    if (!myUserId || !requestId) return
    const text = draft.trim()
    if (!text) return

    setDraft("")
    broadcastTyping(false)

    const { error } = await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: myUserId,
      content: text,
    })

    if (error) {
      console.error("send error:", error)
      setDraft(text)
      return
    }

    const scroller = scrollerRef.current
    if (scroller) requestAnimationFrame(() => (scroller.scrollTop = scroller.scrollHeight))
  }

  const otherName = header?.other_user?.display_name ?? "User"
  const horseName = header?.horse_name ?? ""
  const avatarUrl = header?.other_user?.avatar_url ?? ""

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f6f7fb" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderBottom: "1px solid rgba(15,23,42,0.10)",
          background: "white",
          color: "#0f172a",
        }}
      >
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
          <div style={{ fontWeight: 800, lineHeight: 1.2, fontSize: 14 }}>
            {headerLoading ? "Loading..." : otherName}
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
          gap: 10,
          background:
            "radial-gradient(900px 600px at 20% 10%, rgba(59,130,246,0.12), transparent 60%), radial-gradient(700px 500px at 90% 20%, rgba(14,165,233,0.10), transparent 60%), #f6f7fb",
        }}
      >
        <div ref={topSentinelRef} style={{ height: 1 }} />

        {hasMore && (
          <div style={{ textAlign: "center", opacity: 0.65, fontSize: 12, padding: 8, color: "#0f172a" }}>
            {loadingMore ? "Loading..." : "Scroll up for older messages"}
          </div>
        )}

        {loadingInitial && (
          <div style={{ textAlign: "center", opacity: 0.65, fontSize: 12, padding: 8, color: "#0f172a" }}>
            Loading messages...
          </div>
        )}

        {messages.map((m: Message) => (
          <MessageBubble key={m.id} message={m} isMine={m.sender_id === myUserId} />
        ))}

        <TypingBubbleInline show={otherTyping} />
      </div>

      {/* Composer */}
      <div style={{ padding: 12, borderTop: "1px solid rgba(15,23,42,0.10)", background: "white" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
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
          />

          <button
            onClick={send}
            disabled={!draft.trim()}
            style={{
              height: 44,
              padding: "0 14px",
              borderRadius: 12,
              border: "none",
              fontWeight: 800,
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
