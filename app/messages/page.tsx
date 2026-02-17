"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type ThreadRow = {
  request_id: string
  horse_name: string
  other_display_name: string
  unread_count: number
  last_message: string | null
  last_message_at: string | null
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
      .select("request_id, horse_name, other_display_name, unread_count, last_message, last_message_at")
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

    // refresh list on message insert/update (unread_count + last_message changes)
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

    const ok = window.confirm(
      "Delete this chat for you? It will reappear if a new message is sent."
    )
    if (!ok) return

    // optimistic UI remove
    setDeletingId(requestId)
    setThreads((prev) => prev.filter((t) => t.request_id !== requestId))

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

    setDeletingId(null)

    if (error) {
      console.error("deleteChatForMe error:", error)
      alert("Could not delete chat: " + error.message)
      // rollback by reloading
      load()
      return
    }

    // done — view will now hide it
  }

  return (
    <div style={{ padding: 18, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Messages</h1>

      {loading ? (
        <div style={{ opacity: 0.7 }}>Loading…</div>
      ) : threads.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No conversations yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {threads.map((t) => (
            <div
              key={t.request_id}
              style={{
                border: "1px solid rgba(15,23,42,0.10)",
                borderRadius: 14,
                background: "white",
                boxShadow: "0 10px 20px rgba(0,0,0,0.04)",
                overflow: "hidden",
              }}
            >
              <Link
                href={`/messages/${t.request_id}`}
                prefetch={false}
                style={{ textDecoration: "none", display: "block" }}
              >
                <div style={{ padding: 14, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{t.other_display_name}</div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {t.unread_count > 0 ? (
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
                            fontWeight: 900,
                            background: "rgba(37,99,235,0.95)",
                            color: "white",
                          }}
                        >
                          {t.unread_count}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4, color: "#0f172a" }}>
                    {t.horse_name}
                  </div>

                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9, color: "#0f172a" }}>
                    {t.last_message ?? ""}
                  </div>

                  <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6, color: "#0f172a" }}>
                    {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : ""}
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
                    fontWeight: 900,
                    fontSize: 12,
                    padding: "7px 10px",
                    borderRadius: 10,
                  }}
                >
                  {deletingId === t.request_id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
