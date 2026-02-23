"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type ThreadRow = {
  request_id: string
  horse_name: string
  other_display_name: string
  unread_count: number
  last_message: string | null
  last_message_at: string | null
}

type ThreadUI = ThreadRow & {
  other_user_id: string | null
  other_avatar_url: string | null
  horse_image_url: string | null
  subtitle: string | null

  // ✅ last message attachment signal
  last_is_photo?: boolean
  last_attachment_url?: string | null

  // ✅ role pill for "other user"
  other_role?: "Owner" | "Borrower" | null
}

type ProfileMini = {
  id: string
  display_name: string | null
  full_name: string | null
  avatar_url: string | null
}

type BorrowReqMini = {
  id: string
  horse_id: string
  borrower_id: string
}

type HorseMini = {
  id: string
  name: string | null
  owner_id: string
  photo_url?: string | null
  image_url?: string | null
  cover_url?: string | null
}

type LastMessageMini = {
  request_id: string
  created_at: string
  attachment_type?: string | null
  attachment_bucket?: string | null
  attachment_path?: string | null
}

function cleanName(v: string | null | undefined) {
  const s = (v ?? "").trim()
  return s.length ? s : null
}

function timeLabel(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

function horseImageFromRow(h: HorseMini | null): string | null {
  if (!h) return null
  return (h.photo_url ?? h.image_url ?? h.cover_url ?? null) || null
}

function norm(s: string) {
  return (s || "").toLowerCase().trim()
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function RolePill({ role }: { role: "Owner" | "Borrower" | null | undefined }) {
  if (!role) return null
  const isOwner = role === "Owner"
  return (
    <span
      title={role}
      style={{
        height: 22,
        borderRadius: 999,
        padding: "0 8px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 950,
        border: isOwner ? "1px solid rgba(11,59,46,0.20)" : "1px solid rgba(15,23,42,0.14)",
        background: isOwner ? "rgba(11,59,46,0.10)" : "rgba(15,23,42,0.06)",
        color: isOwner ? "rgba(11,59,46,0.92)" : "rgba(15,23,42,0.78)",
        boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
        whiteSpace: "nowrap",
      }}
    >
      {role}
    </span>
  )
}

function PhotoPill() {
  return (
    <span
      title="Last message was a photo"
      style={{
        height: 22,
        borderRadius: 999,
        padding: "0 8px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 950,
        background: "rgba(202,162,77,0.18)",
        color: "rgba(155,116,40,0.95)",
        border: "1px solid rgba(202,162,77,0.28)",
        boxShadow: "0 10px 22px rgba(155,116,40,0.10)",
        whiteSpace: "nowrap",
      }}
    >
      Photo
    </span>
  )
}

/** ✅ Swipe-to-delete wrapper (mobile-friendly, no libs)
 * - swipe left reveals Delete button
 * - prevents accidental navigation if user swipes
 */
function SwipeRow({
  requestId,
  onDelete,
  children,
  disabled,
}: {
  requestId: string
  onDelete: () => void
  children: (opts: { translateX: number; isOpen: boolean; close: () => void; isSwiping: boolean }) => React.ReactNode
  disabled?: boolean
}) {
  const MAX = 86 // px reveal
  const [tx, setTx] = useState(0) // negative = left
  const [open, setOpen] = useState(false)
  const [swiping, setSwiping] = useState(false)

  const startRef = useRef<{ x: number; y: number; tx: number; active: boolean }>({ x: 0, y: 0, tx: 0, active: false })

  const close = () => {
    setOpen(false)
    setTx(0)
  }

  useEffect(() => {
    // close any open row when clicking elsewhere
    const onDown = (e: MouseEvent) => {
      if (!open) return
      const target = e.target as HTMLElement | null
      if (!target) return
      // if click inside this row, ignore
      const el = document.getElementById(`swipe-row-${requestId}`)
      if (el && el.contains(target)) return
      close()
    }
    window.addEventListener("mousedown", onDown)
    return () => window.removeEventListener("mousedown", onDown)
  }, [open, requestId])

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    // Only enable swipe for touch/pen; still works on mouse but less needed.
    startRef.current = { x: e.clientX, y: e.clientY, tx, active: true }
    setSwiping(false)
    try {
      ;(e.currentTarget as any).setPointerCapture?.(e.pointerId)
    } catch {}
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current.active || disabled) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y

    // If mostly vertical scroll, abort swipe
    if (!swiping && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      startRef.current.active = false
      return
    }

    // start swiping when horizontal intent is clear
    if (!swiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      setSwiping(true)
    }
    if (!swiping) return

    // dragging left reveals actions; dragging right closes
    let next = startRef.current.tx + dx
    next = clamp(next, -MAX, 0)

    setTx(next)
  }

  const onPointerUp = () => {
    if (disabled) return
    if (!startRef.current.active) return
    startRef.current.active = false

    if (!swiping) return

    const shouldOpen = tx <= -MAX * 0.55
    if (shouldOpen) {
      setOpen(true)
      setTx(-MAX)
    } else {
      close()
    }

    // allow click again after release
    setTimeout(() => setSwiping(false), 0)
  }

  return (
    <div
      id={`swipe-row-${requestId}`}
      style={{ position: "relative", borderRadius: 18, overflow: "hidden" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Actions behind */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "stretch",
          background:
            "linear-gradient(180deg, rgba(239,68,68,0.16), rgba(239,68,68,0.10))",
        }}
        aria-hidden="true"
      >
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete()
            close()
          }}
          disabled={disabled}
          style={{
            width: 96,
            border: "none",
            background: "rgba(239,68,68,0.14)",
            color: "#b91c1c",
            fontWeight: 950,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
          title="Delete chat for you"
        >
          Delete
        </button>
      </div>

      {/* Foreground content slides */}
      <div
        style={{
          transform: `translateX(${tx}px)`,
          transition: swiping ? "none" : "transform 160ms ease",
        }}
      >
        {children({ translateX: tx, isOpen: open, close, isSwiping: swiping })}
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<ThreadUI[]>([])
  const [loading, setLoading] = useState(true)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // controls
  const [q, setQ] = useState("")
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)

  const load = async () => {
    setLoading(true)

    const { data: auth } = await supabase.auth.getUser()
    const uid = auth?.user?.id ?? null
    setMyUserId(uid)

    const { data, error } = await supabase
      .from("message_threads")
      .select("request_id, horse_name, other_display_name, unread_count, last_message, last_message_at")
      .order("last_message_at", { ascending: false })

    if (error) {
      console.error("threads load error:", error)
      setThreads([])
      setLoading(false)
      return
    }

    const base = (data ?? []) as ThreadRow[]
    if (!uid || base.length === 0) {
      setThreads(
        base.map((t) => ({
          ...t,
          other_user_id: null,
          other_avatar_url: null,
          horse_image_url: null,
          subtitle: t.horse_name,
          last_is_photo: false,
          last_attachment_url: null,
          other_role: null,
        }))
      )
      setLoading(false)
      return
    }

    const requestIds = base.map((t) => t.request_id)

    // ✅ last message attachment (best effort)
    let lastMsgMap = new Map<string, LastMessageMini>()
    try {
      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("request_id, created_at, attachment_type, attachment_bucket, attachment_path")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false })
        .limit(300)

      if (msgErr) throw msgErr

      const seen = new Set<string>()
      for (const m of (msgs ?? []) as LastMessageMini[]) {
        if (seen.has(m.request_id)) continue
        seen.add(m.request_id)
        lastMsgMap.set(m.request_id, m)
      }
    } catch (e) {
      console.warn("last message hydrate failed (non-fatal)", e)
      lastMsgMap = new Map()
    }

    try {
      const { data: reqs, error: reqErr } = await supabase
        .from("borrow_requests")
        .select("id, horse_id, borrower_id")
        .in("id", requestIds)

      if (reqErr) throw reqErr

      const reqMap = new Map<string, BorrowReqMini>()
      for (const r of (reqs ?? []) as BorrowReqMini[]) reqMap.set(r.id, r)

      const horseIds = Array.from(new Set((reqs ?? []).map((r: any) => r.horse_id).filter(Boolean)))
      let horses: HorseMini[] = []
      if (horseIds.length) {
        const { data: hs, error: horseErr } = await supabase
          .from("horses")
          .select("id, name, owner_id, photo_url, image_url, cover_url")
          .in("id", horseIds)

        if (horseErr) throw horseErr
        horses = (hs ?? []) as HorseMini[]
      }

      const horseMap = new Map<string, HorseMini>()
      for (const h of horses) horseMap.set(h.id, h)

      const otherIds: string[] = []
      for (const t of base) {
        const r = reqMap.get(t.request_id)
        if (!r) continue
        const h = horseMap.get(r.horse_id)
        if (!h) continue
        const otherId = h.owner_id === uid ? r.borrower_id : h.owner_id
        if (otherId) otherIds.push(otherId)
      }

      const uniqOtherIds = Array.from(new Set(otherIds))
      let profs: ProfileMini[] = []
      if (uniqOtherIds.length) {
        const { data: ps, error: profErr } = await supabase
          .from("profiles")
          .select("id, display_name, full_name, avatar_url")
          .in("id", uniqOtherIds)

        if (profErr) throw profErr
        profs = (ps ?? []) as ProfileMini[]
      }

      const profMap = new Map<string, ProfileMini>()
      for (const p of profs) profMap.set(p.id, p)

      const hydrated: ThreadUI[] = await Promise.all(
        base.map(async (t) => {
          const r = reqMap.get(t.request_id) ?? null
          const h = r ? horseMap.get(r.horse_id) ?? null : null

          const ownerId = h?.owner_id ?? null
          const borrowerId = r?.borrower_id ?? null
          const otherId = r && h ? (h.owner_id === uid ? r.borrower_id : h.owner_id) : null

          const p = otherId ? profMap.get(otherId) ?? null : null
          const display = cleanName(p?.display_name) || cleanName(p?.full_name) || t.other_display_name || "User"

          // role label for other
          let role: "Owner" | "Borrower" | null = null
          if (otherId && ownerId && borrowerId) {
            role = otherId === ownerId ? "Owner" : otherId === borrowerId ? "Borrower" : null
          }

          // photo pill + optional preview
          const last = lastMsgMap.get(t.request_id) ?? null
          const isPhoto = (last?.attachment_type ?? null) === "image"
          let signed: string | null = null
          if (isPhoto && last?.attachment_bucket && last?.attachment_path) {
            try {
              const { data: signedData, error: signedErr } = await supabase.storage
                .from(last.attachment_bucket)
                .createSignedUrl(last.attachment_path, 60 * 30) // 30 min
              if (!signedErr) signed = signedData?.signedUrl ?? null
            } catch {}
          }

          return {
            ...t,
            other_user_id: otherId,
            other_avatar_url: p?.avatar_url ?? null,
            horse_image_url: horseImageFromRow(h),
            other_display_name: display,
            subtitle: cleanName(h?.name) || t.horse_name || null,
            other_role: role,
            last_is_photo: isPhoto,
            last_attachment_url: signed,
          }
        })
      )

      setThreads(hydrated)
    } catch (e: any) {
      console.error("threads hydrate error:", e)
      setThreads(
        base.map((t) => ({
          ...t,
          other_user_id: null,
          other_avatar_url: null,
          horse_image_url: null,
          subtitle: t.horse_name,
          last_is_photo: (lastMsgMap.get(t.request_id)?.attachment_type ?? null) === "image",
          last_attachment_url: null,
          other_role: null,
        }))
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel("threads:refresh")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deleteChatForMe = async (requestId: string) => {
    if (!myUserId) {
      alert("Please log in again.")
      return
    }

    const ok = window.confirm("Delete this chat for you? It will reappear if a new message is sent.")
    if (!ok) return

    setDeletingId(requestId)
    setThreads((prev) => prev.filter((t) => t.request_id !== requestId))

    const { error } = await supabase
      .from("message_thread_deletions")
      .upsert(
        { user_id: myUserId, request_id: requestId, deleted_at: new Date().toISOString() },
        { onConflict: "user_id,request_id" }
      )

    setDeletingId(null)

    if (error) {
      console.error("deleteChatForMe error:", error)
      alert("Could not delete chat: " + error.message)
      load()
    }
  }

  // ✅ Mark all read (only incoming, only unread, only threads currently shown by filters)
  const markAllRead = async () => {
    if (!myUserId) return
    if (markingAllRead) return

    const visibleIds = filtered.map((t) => t.request_id)
    if (visibleIds.length === 0) return

    setMarkingAllRead(true)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from("messages")
        .update({ read_at: now })
        .in("request_id", visibleIds)
        .neq("sender_id", myUserId)
        .is("read_at", null)

      if (error) {
        console.error("markAllRead error:", error)
        alert("Could not mark all read: " + error.message)
        return
      }

      // optimistic UI: clear unread counts on visible
      setThreads((prev) =>
        prev.map((t) => (visibleIds.includes(t.request_id) ? { ...t, unread_count: 0 } : t))
      )
    } finally {
      setMarkingAllRead(false)
    }
  }

  const counts = useMemo(() => {
    const total = threads.length
    const unread = threads.reduce((acc, t) => acc + ((t.unread_count ?? 0) > 0 ? 1 : 0), 0)
    return { total, unread }
  }, [threads])

  const filtered = useMemo(() => {
    const query = norm(q)
    return threads.filter((t) => {
      if (showUnreadOnly && !(t.unread_count > 0)) return false
      if (!query) return true
      const hay = norm([t.other_display_name, t.subtitle ?? "", t.horse_name ?? "", t.last_message ?? ""].join(" "))
      return hay.includes(query)
    })
  }, [threads, q, showUnreadOnly])

  const visibleUnreadCount = useMemo(() => {
    return filtered.reduce((acc, t) => acc + (t.unread_count > 0 ? 1 : 0), 0)
  }, [filtered])

  return (
    <div style={{ padding: 18, maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: -0.2, color: "#0f172a" }}>Messages</div>

          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: "rgba(11,59,46,0.82)",
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(11,59,46,0.18)",
                background:
                  "radial-gradient(800px 220px at 10% 0%, rgba(202,162,77,0.16), transparent 60%), rgba(255,255,255,0.72)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
              }}
              title="Chats are private to participants. Identity verification is required to use messaging."
            >
              🔒 Verified & private chat
            </div>

            <div style={{ fontSize: 12, fontWeight: 850, color: "rgba(15,23,42,0.60)" }}>
              {counts.total} total • {counts.unread} with unread
            </div>
          </div>
        </div>

        {/* ✅ Mark all read */}
        <button
          onClick={markAllRead}
          disabled={markingAllRead || visibleUnreadCount === 0 || loading}
          className="pmp-hoverLift"
          style={{
            height: 42,
            padding: "0 12px",
            borderRadius: 14,
            border: "1px solid rgba(15,23,42,0.12)",
            background:
              visibleUnreadCount === 0
                ? "rgba(255,255,255,0.65)"
                : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(245,241,232,0.78))",
            fontWeight: 950,
            cursor: markingAllRead || visibleUnreadCount === 0 || loading ? "not-allowed" : "pointer",
            boxShadow: "0 12px 26px rgba(15,23,42,0.06)",
            color: "#0f172a",
            whiteSpace: "nowrap",
          }}
          title="Marks all unread incoming messages as read (for currently visible threads)"
        >
          {markingAllRead ? "Marking…" : "Mark all read"}
        </button>
      </div>

      {/* Controls */}
      <div style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats…"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 16,
              border: "1px solid rgba(15,23,42,0.12)",
              background: "rgba(255,255,255,0.86)",
              padding: "0 12px",
              fontWeight: 800,
              outline: "none",
              boxShadow: "0 12px 26px rgba(15,23,42,0.06)",
            }}
          />
        </div>

        <button
          onClick={() => setShowUnreadOnly((v) => !v)}
          className="pmp-hoverLift"
          style={{
            height: 44,
            padding: "0 12px",
            borderRadius: 16,
            border: showUnreadOnly ? "1px solid rgba(202,162,77,0.45)" : "1px solid rgba(15,23,42,0.12)",
            background: showUnreadOnly
              ? "linear-gradient(180deg, rgba(202,162,77,0.96), rgba(155,116,40,0.92))"
              : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(245,241,232,0.78))",
            color: showUnreadOnly ? "white" : "#0f172a",
            fontWeight: 950,
            cursor: "pointer",
            boxShadow: showUnreadOnly ? "0 14px 30px rgba(155,116,40,0.20)" : "0 12px 26px rgba(15,23,42,0.06)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
          }}
          title="Show only chats with unread messages"
        >
          {showUnreadOnly ? "Unread only ✓" : "Unread only"}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ opacity: 0.7 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 18,
            background:
              "radial-gradient(900px 420px at 12% 0%, rgba(202,162,77,0.16), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,241,232,0.82))",
            boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
            padding: 18,
          }}
        >
          <div style={{ fontWeight: 950, color: "#0f172a" }}>
            {threads.length === 0 ? "No conversations yet" : "No matches"}
          </div>
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
            {threads.length === 0
              ? "When you request a pony or receive a request, your chat will appear here."
              : "Try a different search or turn off Unread only."}
          </div>

          {threads.length > 0 ? (
            <button
              onClick={() => {
                setQ("")
                setShowUnreadOnly(false)
              }}
              className="pmp-hoverLift"
              style={{
                marginTop: 12,
                height: 42,
                padding: "0 12px",
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,0.12)",
                background: "white",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              Reset filters
            </button>
          ) : null}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((t) => {
            const time = timeLabel(t.last_message_at)
            const hasUnread = (t.unread_count ?? 0) > 0
            const deleting = deletingId === t.request_id

            const cardBaseStyle: React.CSSProperties = {
              border: hasUnread ? "1px solid rgba(202,162,77,0.35)" : "1px solid rgba(15,23,42,0.10)",
              borderRadius: 18,
              background:
                "radial-gradient(900px 420px at 12% 0%, rgba(202,162,77,0.14), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,241,232,0.82))",
              boxShadow: hasUnread ? "0 18px 55px rgba(15,23,42,0.10)" : "0 14px 40px rgba(15,23,42,0.08)",
              overflow: "hidden",
            }

            return (
              <SwipeRow
                key={t.request_id}
                requestId={t.request_id}
                onDelete={() => deleteChatForMe(t.request_id)}
                disabled={deleting}
              >
                {({ isSwiping }) => (
                  <div className="pmp-hoverLift" style={cardBaseStyle}>
                    <Link
                      href={`/messages/${t.request_id}`}
                      prefetch={false}
                      style={{ textDecoration: "none", display: "block" }}
                      onClick={(e) => {
                        // ✅ prevent navigation if user was swiping
                        if (isSwiping) {
                          e.preventDefault()
                          e.stopPropagation()
                        }
                      }}
                    >
                      <div style={{ padding: 14, cursor: "pointer" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          {/* Avatar stack */}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
                            <div
                              style={{
                                width: 46,
                                height: 46,
                                borderRadius: 999,
                                overflow: "hidden",
                                background: "rgba(15,23,42,0.06)",
                                border: hasUnread ? "2px solid rgba(202,162,77,0.45)" : "2px solid rgba(15,23,42,0.10)",
                                boxShadow: "0 14px 28px rgba(15,23,42,0.10)",
                              }}
                            >
                              {t.other_avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={t.other_avatar_url}
                                  alt={t.other_display_name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "grid",
                                    placeItems: "center",
                                    fontWeight: 950,
                                    color: "rgba(15,23,42,0.65)",
                                  }}
                                >
                                  {t.other_display_name?.slice(0, 1)?.toUpperCase() ?? "U"}
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                width: 46,
                                height: 46,
                                borderRadius: 16,
                                overflow: "hidden",
                                background: "rgba(15,23,42,0.06)",
                                border: "1px solid rgba(15,23,42,0.10)",
                                boxShadow: "0 14px 28px rgba(15,23,42,0.08)",
                              }}
                              title={t.subtitle ?? ""}
                            >
                              {t.horse_image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={t.horse_image_url}
                                  alt={t.subtitle ?? "Horse"}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 16 }}>
                                  🐴
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 950,
                                    color: "#0f172a",
                                    fontSize: 14,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {t.other_display_name}
                                </div>

                                <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                  <RolePill role={t.other_role ?? null} />
                                  {t.last_is_photo ? <PhotoPill /> : null}
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 10, alignItems: "center", flex: "0 0 auto" }}>
                                {time ? (
                                  <div style={{ fontSize: 12, fontWeight: 850, color: "rgba(15,23,42,0.55)" }}>{time}</div>
                                ) : null}

                                {hasUnread ? (
                                  <div
                                    style={{
                                      minWidth: 30,
                                      height: 22,
                                      borderRadius: 999,
                                      padding: "0 8px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 12,
                                      fontWeight: 950,
                                      background: "linear-gradient(180deg, rgba(202,162,77,0.95), rgba(155,116,40,0.92))",
                                      color: "white",
                                      boxShadow: "0 12px 24px rgba(155,116,40,0.18)",
                                    }}
                                  >
                                    {t.unread_count}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 850, color: "rgba(11,59,46,0.72)" }}>
                              {t.subtitle ?? ""}
                            </div>

                            {/* Preview row: message text + optional photo preview */}
                            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "rgba(15,23,42,0.80)",
                                  fontWeight: hasUnread ? 900 : 700,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                {t.last_is_photo ? (t.last_message?.trim() ? t.last_message : "Sent a photo") : (t.last_message ?? "")}
                              </div>

                              {t.last_is_photo && t.last_attachment_url ? (
                                <div
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 14,
                                    overflow: "hidden",
                                    border: "1px solid rgba(15,23,42,0.10)",
                                    background: "rgba(15,23,42,0.06)",
                                    boxShadow: "0 12px 26px rgba(15,23,42,0.08)",
                                    flex: "0 0 auto",
                                  }}
                                  title="Photo preview"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={t.last_attachment_url}
                                    alt="Last photo"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                </div>
                              ) : null}
                            </div>

                            {/* Swipe hint on small screens (subtle) */}
                            <div
                              style={{
                                marginTop: 10,
                                fontSize: 11,
                                fontWeight: 850,
                                color: "rgba(15,23,42,0.46)",
                              }}
                            >
                              <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 999, border: "1px solid rgba(15,23,42,0.10)", background: "rgba(255,255,255,0.55)" }}>
                                Swipe left to delete
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Footer actions (still accessible even without swipe) */}
                    <div
                      style={{
                        borderTop: "1px solid rgba(15,23,42,0.06)",
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "flex-end",
                        background: "rgba(255,255,255,0.55)",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteChatForMe(t.request_id)
                        }}
                        disabled={deleting}
                        style={{
                          border: "1px solid rgba(239,68,68,0.25)",
                          background: deleting ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.10)",
                          color: "#b91c1c",
                          cursor: deleting ? "not-allowed" : "pointer",
                          fontWeight: 950,
                          fontSize: 12,
                          padding: "7px 10px",
                          borderRadius: 12,
                        }}
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </SwipeRow>
            )
          })}
        </div>
      )}
    </div>
  )
}