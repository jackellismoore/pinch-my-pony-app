"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/app/lib/supabaseClient"
import { usePaginatedMessages, type Message } from "@/app/lib/hooks/usePaginatedMessages"
import MessageBubble from "@/app/components/MessageBubble"
import TypingBubbleInline from "@/app/components/TypingBubbleInline"

type OtherUser = {
  id: string
  display_name: string
  avatar_url: string | null
}

type ThreadHeader = {
  horse_name: string
  other_user: OtherUser | null
}

export default function MessageThreadPage() {
  const router = useRouter()
  const params = useParams() as { requestId?: string }
  const requestId = params?.requestId ?? ""

  // Messages + pagination
  const { messages, loadMore, hasMore, loadingMore, loadingInitial } =
    usePaginatedMessages(requestId)

  // Scroll container + sentinel
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)

  // Auth + header state
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [header, setHeader] = useState<ThreadHeader | null>(null)
  const [headerLoading, setHeaderLoading] = useState(true)

  // Presence/typing state (kept here — hook is messages only)
  const [otherOnline, setOtherOnline] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)

  // ---- Derived: other user id ----
  const otherUserId = useMemo(() => {
    if (!myUserId) return null
    // Find the first message not from me to infer other participant
    const m = messages.find((x) => x.sender_id !== myUserId)
    return m?.sender_id ?? header?.other_user?.id ?? null
  }, [messages, myUserId, header?.other_user?.id])

  // ---- Basic guard ----
  useEffect(() => {
    if (!requestId) return
  }, [requestId])

  // ---- Load my auth user id ----
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

  // ---- Load thread header (horse name + other user profile) ----
  // This is intentionally lightweight and safe:
  // - fetch request (horse_id, borrower_id)
  // - fetch horse name (horses.name)
  // - decide other user as owner or borrower (whichever isn't me)
  // - fetch other user's profile display_name/avatar_url
  useEffect(() => {
    if (!requestId || !myUserId) return
    let cancelled = false

    ;(async () => {
      setHeaderLoading(true)

      // 1) borrow_requests row
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

      // 2) horse name + owner_id
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

      const otherId = horse.owner_id === myUserId ? req.borrower_id : horse.owner_id

      // 3) other profile
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", otherId)
        .single()

      if (cancelled) return
      if (profErr || !prof) {
        console.error("Header: profiles error", profErr)
        setHeader({
          horse_name: horse.name,
          other_user: { id: otherId, display_name: "User", avatar_url: null },
        })
        setHeaderLoading(false)
        return
      }

      setHeader({
        horse_name: horse.name,
        other_user: { id: prof.id, display_name: prof.display_name ?? "User", avatar_url: prof.avatar_url },
      })
      setHeaderLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [requestId, myUserId])

  // ---- Presence + typing channel ----
  // Assumes you already have a working presence:thread:<requestId> pattern.
  // This keeps it on this page, not inside the pagination hook.
  useEffect(() => {
    if (!requestId || !myUserId) return

    const channel = supabase.channel(`presence:thread:${requestId}`, {
      config: { presence: { key: myUserId } },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ user_id?: string; typing?: boolean }>
        >

        // Find if the other user is present + typing
        let online = false
        let typing = false

        for (const key of Object.keys(state)) {
          // key is presence key; payload may include fields
          const metas = state[key] ?? []
          for (const meta of metas) {
            const uid = meta.user_id ?? key
            if (uid && uid !== myUserId) {
              online = true
              if (meta.typing) typing = true
            }
          }
        }

        setOtherOnline(online)
        setOtherTyping(typing)
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return
        // Track ourselves so others can detect online + typing
        await channel.track({ user_id: myUserId, typing: false })
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, myUserId])

  // ---- Infinite scroll (load older when top sentinel visible) + scroll anchoring ----
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
          scroller.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)
        })
      },
      { root: scroller, threshold: 0.1 }
    )

    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loadMore])

  // ---- Auto-scroll to bottom on first load only (safer) ----
  const didAutoScrollRef = useRef(false)
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (loadingInitial) return
    if (didAutoScrollRef.current) return

    // Auto-scroll to bottom once after initial messages render
    didAutoScrollRef.current = true
    requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight
    })
  }, [loadingInitial])

  // ---- Optional: mark visible messages as read for recipient ----
  // This is conservative and avoids hammering:
  // - when messages change and we know other user id, mark unread messages not sent by me.
  useEffect(() => {
    if (!requestId || !myUserId) return
    if (messages.length === 0) return

    const unreadIds = messages
      .filter((m) => m.sender_id !== myUserId && !m.read_at)
      .map((m) => m.id)

    if (unreadIds.length === 0) return

    // Fire-and-forget (don’t block UI)
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(({ error }) => {
        if (error) console.error("mark read error:", error)
      })
  }, [messages, myUserId, requestId])

  // ---- Simple inline header (avatar, names, online status) ----
  const otherName = header?.other_user?.display_name ?? "User"
  const horseName = header?.horse_name ?? ""
  const avatarUrl = header?.other_user?.avatar_url ?? ""

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(2,6,23,0.95) 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            overflow: "hidden",
            background: "rgba(255,255,255,0.12)",
            flexShrink: 0,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={otherName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null}
        </div>

        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 700, lineHeight: 1.2, fontSize: 14 }}>
            {headerLoading ? "Loading..." : otherName}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ opacity: 0.8, fontSize: 12, whiteSpace: "nowrap" }}>
              {horseName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.9 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: otherOnline ? "#22c55e" : "rgba(255,255,255,0.25)",
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
            "radial-gradient(1200px 800px at 20% 10%, rgba(99,102,241,0.25), transparent 55%), radial-gradient(900px 700px at 90% 30%, rgba(56,189,248,0.18), transparent 55%), linear-gradient(180deg, #020617 0%, #0b1225 100%)",
        }}
      >
        <div ref={topSentinelRef} style={{ height: 1 }} />

        {hasMore && (
          <div style={{ textAlign: "center", opacity: 0.75, fontSize: 12, padding: 8, color: "white" }}>
            {loadingMore ? "Loading..." : "Scroll up for older messages"}
          </div>
        )}

        {loadingInitial && (
          <div style={{ textAlign: "center", opacity: 0.75, fontSize: 12, padding: 8, color: "white" }}>
            Loading messages...
          </div>
        )}

        {messages.map((m: Message) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {/* Typing bubble stays in-stream, as you wanted */}
        {/* If your TypingBubbleInline expects a prop, pass it here. */}
        <TypingBubbleInline />

        {/* If you want your existing "otherTyping" state to control TypingBubbleInline,
            either pass it as a prop (recommended), or let TypingBubbleInline handle its own presence subscription.
            Example prop usage (if supported):
            <TypingBubbleInline isTyping={otherTyping} />
        */}
        {false && otherTyping}
      </div>
    </div>
  )
}
