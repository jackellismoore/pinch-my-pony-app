"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type ThreadRow = {
  request_id: string
  horse_name: string
  other_display_name: string
  other_user_id: string
  other_avatar_url: string | null
  unread_count: number
  last_message: string | null
  last_message_at: string | null
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p.slice(0, 1).toUpperCase()).join("")
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
      .select("request_id, horse_name, other_display_name, other_user_id, other_avatar_url, unread_count, last_message, last_message_at")
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

  const heroBg = useMemo(
    () =>
      "radial-gradient(900px 600px at 15% 0%, rgba(202,162,77,0.18), transparent 60%), radial-gradient(900px 700px at 95% 10%, rgba(11,59,46,0.14), transparent 60%), linear-gradient(180deg, rgba(245,241,232,0.90), rgba(250,250,250,0.95))",
    []
  )

  return (
    <div
      style={{
        padding: 18,
        maxWidth: 860,
        margin: "0 auto",
        minHeight: "calc(100vh - 60px)",
      }}
    >
      <div
        style={{
          borderRadius: 20,
          padding: "16px 16px",
          border: "1px solid var(--pmp-border)",
          background: heroBg,
          boxShadow: "var(--pmp-shadow)",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 950, margin: 0, color: "var(--pmp-navy)" }}>Messages</h1>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, fontWeight: 800, color: "var(--pmp-navy)" }}>
              Your private conversations — polished, secure, and ready for real riders.
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ opacity: 0.75, color: "var(--pmp-navy)" }}>Loading…</div>
      ) : threads.length === 0 ? (
        <div
          style={{
            border: "1px dashed rgba(15,23,42,0.18)",
            borderRadius: 18,
            padding: 16,
            background: "rgba(245,241,232,0.55)",
            color: "var(--pmp-navy)",
            opacity: 0.9,
            fontWeight: 800,
          }}
        >
          No conversations yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {threads.map((t) => {
            const when = t.last_message_at ? new Date(t.last_message_at).toLocaleString() : ""
            const last = t.last_message ?? ""
            const showUnread = t.unread_count > 0

            return (
              <div
                key={t.request_id}
                style={{
                  border: "1px solid var(--pmp-border)",
                  borderRadius: 18,
                  background: "var(--pmp-card)",
                  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
                  overflow: "hidden",
                  transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
                }}
              >
                <Link href={`/messages/${t.request_id}`} prefetch={false} style={{ textDecoration: "none", display: "block" }}>
                  <div
                    style={{
                      padding: 14,
                      cursor: "pointer",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 16,
                        overflow: "hidden",
                        border: "1px solid rgba(15,23,42,0.12)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(245,241,232,0.85))",
                        boxShadow: "0 12px 24px rgba(15,23,42,0.10)",
                        flex: "0 0 auto",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--pmp-forest)",
                        fontWeight: 950,
                      }}
                      aria-label={`${t.other_display_name} avatar`}
                    >
                      {t.other_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.other_avatar_url} alt={t.other_display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 14 }}>{initials(t.other_display_name || "U")}</span>
                      )}
                    </div>

                    {/* Main */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <div style={{ fontWeight: 950, color: "var(--pmp-navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.other_display_name}
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          {showUnread ? (
                            <div
                              style={{
                                minWidth: 28,
                                height: 22,
                                borderRadius: 999,
                                padding: "0 8px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 950,
                                background: "rgba(202,162,77,0.92)",
                                color: "var(--pmp-navy)",
                                border: "1px solid rgba(15,23,42,0.10)",
                                boxShadow: "0 10px 20px rgba(202,162,77,0.18)",
                              }}
                            >
                              {t.unread_count}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 900,
                            color: "var(--pmp-forest)",
                            background: "rgba(11,59,46,0.08)",
                            border: "1px solid rgba(11,59,46,0.14)",
                            padding: "4px 8px",
                            borderRadius: 999,
                          }}
                        >
                          {t.horse_name}
                        </span>

                        <span style={{ fontSize: 11, opacity: 0.65, color: "var(--pmp-navy)", fontWeight: 800 }}>{when}</span>
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          color: "var(--pmp-navy)",
                          opacity: 0.9,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={last}
                      >
                        {last}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Footer actions */}
                <div
                  style={{
                    borderTop: "1px solid rgba(15,23,42,0.06)",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "flex-end",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(245,241,232,0.35))",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteChatForMe(t.request_id)
                    }}
                    disabled={deletingId === t.request_id}
                    style={{
                      border: "1px solid rgba(239,68,68,0.25)",
                      background: deletingId === t.request_id ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.10)",
                      color: "#b91c1c",
                      cursor: deletingId === t.request_id ? "not-allowed" : "pointer",
                      fontWeight: 950,
                      fontSize: 12,
                      padding: "7px 10px",
                      borderRadius: 12,
                    }}
                  >
                    {deletingId === t.request_id ? "Deleting…" : "Delete"}
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