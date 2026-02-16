"use client"

import type { Message } from "@/lib/hooks/usePaginatedMessages"

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function MessageBubble({
  message,
  isMine,
}: {
  message: Message
  isMine: boolean
}) {
  const mine = Boolean(isMine)

  const checks = mine ? (message.read_at ? "✓✓" : "✓") : ""

  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: 560,
          padding: "10px 12px",
          borderRadius: 16,
          background: mine ? "rgba(37,99,235,0.92)" : "rgba(255,255,255,0.78)",
          color: mine ? "white" : "#0f172a",
          boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
          border: mine ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(15,23,42,0.08)",
          wordBreak: "break-word",
        }}
      >
        <div style={{ fontSize: 14, lineHeight: 1.45 }}>{message.content}</div>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            fontSize: 11,
            opacity: 0.7,
            alignItems: "center",
          }}
        >
          <span>{formatTime(message.created_at)}</span>
          {mine ? <span style={{ letterSpacing: 0.5 }}>{checks}</span> : null}
        </div>
      </div>
    </div>
  )
}
