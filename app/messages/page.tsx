"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type ThreadRow = {
  request_id: string
  horse_name: string
  other_user_id: string
  other_display_name: string
  other_avatar_url: string | null
  unread_count: number
  last_message: string | null
  last_message_at: string | null
}

function formatWhen(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" })
}

function clamp(s: string | null | undefined, n: number) {
  const t = (s ?? "").trim()
  if (!t) return ""
  return t.length > n ? t.slice(0, n - 1) + "…" : t
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)

    const { data: auth } = await supabase.auth.getUser()
    const uid = auth?.user?.id ?? null
    setMyUserId(uid)

    const { data, error } = await supabase
      .from("message_threads")
      .select(
        "request_id, horse_name, other_user_id, other_display_name, other_avatar_url, unread_count, last_message, last_message_at"
      )
      .order("last_message_at", { ascending: false })

    if (error) {
      console.error("threads load error:", error)
      setThreads([])
      setLoading(false)
      return
    }

    setThreads((data ?? []) as ThreadRow[])
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
      return
    }
  }

  const header = useMemo(
    () => (
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 950, margin: 0, letterSpacing: -0.2, color: "#0b3b2e" }}>
            Messages
          </h1>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.78, color: "#0f172a" }}>
            Private chats with verified members
          </div>
        </div>
      </div>
    ),
    []
  )

  return (
    <div style={{ padding: 18, maxWidth: 900, margin: "0 auto" }}>
      {header}

      <div style={{ height: 14 }} />

      {loading ? (
        <div style={{ opacity: 0.75, color: "#0f172a" }}>Loading…</div>
      ) : threads.length === 0 ? (
        <div
          style={{
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 18,
            background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(245,241,232,0.78))",
            boxShadow: "0 16px 40px rgba(15,23,42,0.10)",
            padding: 16,
            color: "#0f172a",
          }}
        >
          <div style={{ fontWeight: 950 }}>No conversations yet.</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.78 }}>
            When you request a pony (or approve a request), your chat will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {threads.map((t) => {
            const when = formatWhen(t.last_message_at)
            const last = clamp(t.last_message, 120)
            const isDeleting = deletingId === t.request_id

            return (
              <div
                key={t.request_id}
                className="pmp-hoverLift"
                style={{
                  border: "1px solid rgba(15,23,42,0.10)",
                  borderRadius: 18,
                  background:
                    "radial-gradient(700px 220px at 12% 0%, rgba(202,162,77,0.18), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,241,232,0.78))",
                  boxShadow: "0 16px 44px rgba(15,23,42,0.10)",
                  overflow: "hidden",
                }}
              >
                <Link
                  href={`/messages/${t.request_id}`}
                  prefetch={false}
                  style={{ textDecoration: "none", display: "block", color: "inherit" }}
                >
                  <div style={{ padding: 14, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Avatar */}
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 999,
                          overflow: "hidden",
                          background: "rgba(15,23,42,0.06)",
                          border: "2px solid rgba(202,162,77,0.35)",
                          boxShadow: "0 10px 22px rgba(15,23,42,0.10)",
                          flex: "0 0 auto",
                        }}
                      >
                        {t.other_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.other_avatar_url}
                            alt={t.other_display_name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : null}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div
                            style={{
                              fontWeight: 950,
                              color: "#0f172a",
                              letterSpacing: -0.2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.other_display_name}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
                            {when ? (
                              <div style={{ fontSize: 11, opacity: 0.65, color: "#0f172a" }}>{when}</div>
                            ) : null}

                            {t.unread_count > 0 ? (
                              <div
                                style={{
                                  minWidth: 30,
                                  height: 22,
                                  borderRadius: 999,
                                  padding: "0 9px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: 950,
                                  background: "linear-gradient(180deg, rgba(202,162,77,0.95), rgba(164,123,44,0.95))",
                                  color: "white",
                                  boxShadow: "0 10px 18px rgba(202,162,77,0.22)",
                                }}
                                title="Unread"
                              >
                                {t.unread_count}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.78, color: "#0b3b2e", fontWeight: 850 }}>
                          {t.horse_name}
                        </div>

                        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.92, color: "#0f172a" }}>{last}</div>
                      </div>
                    </div>
                  </div>
                </Link>

                <div
                  style={{
                    borderTop: "1px solid rgba(15,23,42,0.06)",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteChatForMe(t.request_id)
                    }}
                    disabled={isDeleting}
                    style={{
                      border: "1px solid rgba(239,68,68,0.25)",
                      background: isDeleting ? "rgba(239,68,68,0.20)" : "rgba(239,68,68,0.10)",
                      color: "#b91c1c",
                      cursor: isDeleting ? "not-allowed" : "pointer",
                      fontWeight: 950,
                      fontSize: 12,
                      padding: "7px 10px",
                      borderRadius: 12,
                    }}
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}