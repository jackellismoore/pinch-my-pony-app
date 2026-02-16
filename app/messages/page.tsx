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

  const load = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("message_threads")
      .select(
        "request_id, horse_name, other_display_name, unread_count, last_message, last_message_at"
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

    // realtime refresh when messages change
    const channel = supabase
      .channel("threads:refresh")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>
        Messages
      </h1>

      {loading ? (
        <div style={{ opacity: 0.7 }}>Loading…</div>
      ) : threads.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No conversations yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {threads.map((t) => (
            <Link
              key={t.request_id}
              href={`/messages/${t.request_id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  border: "1px solid rgba(15,23,42,0.10)",
                  borderRadius: 14,
                  padding: 16,
                  background: "white",
                  cursor: "pointer",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>
                    {t.other_display_name}
                  </div>

                  {t.unread_count > 0 && (
                    <div
                      style={{
                        minWidth: 26,
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
                  )}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    marginTop: 4,
                    color: "#0f172a",
                  }}
                >
                  {t.horse_name}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    marginTop: 8,
                    opacity: 0.9,
                    color: "#0f172a",
                  }}
                >
                  {t.last_message ?? ""}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    marginTop: 6,
                    opacity: 0.6,
                    color: "#0f172a",
                  }}
                >
                  {t.last_message_at
                    ? new Date(t.last_message_at).toLocaleString()
                    : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
