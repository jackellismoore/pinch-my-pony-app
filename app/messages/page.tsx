"use client"

import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
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

    // refresh list on any message insert/update
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
            <button
              key={t.request_id}
              onClick={() => router.push(`/messages/${t.request_id}`)} // ✅ THIS OPENS /messages/[requestId]
              style={{
                textAlign: "left",
                border: "1px solid rgba(15,23,42,0.10)",
                borderRadius: 14,
                padding: 14,
                background: "white",
                cursor: "pointer",
                boxShadow: "0 10px 20px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>{t.other_display_name}</div>

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

              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>{t.horse_name}</div>

              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
                {t.last_message ?? ""}
              </div>

              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>
                {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : ""}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
