"use client"

import type { UIMessage } from "@/lib/hooks/usePaginatedMessages"

type GroupPos = "single" | "start" | "middle" | "end"

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function bubbleRadius(isMine: boolean, pos: GroupPos) {
  // WhatsApp-ish grouping corners
  const r = 16
  const tight = 8

  if (pos === "single") return { borderRadius: r }
  if (isMine) {
    if (pos === "start") return { borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomRightRadius: tight, borderBottomLeftRadius: r }
    if (pos === "middle") return { borderTopLeftRadius: r, borderTopRightRadius: tight, borderBottomRightRadius: tight, borderBottomLeftRadius: r }
    return { borderTopLeftRadius: r, borderTopRightRadius: tight, borderBottomRightRadius: r, borderBottomLeftRadius: r } // end
  } else {
    if (pos === "start") return { borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomRightRadius: r, borderBottomLeftRadius: tight }
    if (pos === "middle") return { borderTopLeftRadius: tight, borderTopRightRadius: r, borderBottomRightRadius: r, borderBottomLeftRadius: tight }
    return { borderTopLeftRadius: tight, borderTopRightRadius: r, borderBottomRightRadius: r, borderBottomLeftRadius: r } // end
  }
}

function statusGlyph(m: UIMessage, isMine: boolean) {
  if (!isMine) return ""
  if (m.client_status === "pending") return "⏳"
  if (m.client_status === "error") return "⚠"
  // sent vs seen
  if (m.read_at) return "✓✓"
  return "✓"
}

export default function MessageBubble({
  message,
  isMine,
  groupPos = "single",
}: {
  message: UIMessage
  isMine: boolean
  groupPos?: GroupPos
}) {
  const mine = Boolean(isMine)

  const bg =
    message.client_status === "error"
      ? "rgba(239,68,68,0.22)"
      : mine
        ? "linear-gradient(180deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95))"
        : "rgba(255,255,255,0.10)"

  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: 560,
          padding: "10px 12px",
          ...bubbleRadius(mine, groupPos),
          background: bg,
          color: "white",
          boxShadow: "0 10px 20px rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,255,255,0.10)",
          wordBreak: "break-word",
          opacity: message.client_status === "pending" ? 0.85 : 1,
        }}
        title={message.client_status === "error" ? "Failed to send" : undefined}
      >
        <div style={{ fontSize: 14, lineHeight: 1.45 }}>{message.content}</div>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            fontSize: 11,
            opacity: 0.8,
            alignItems: "center",
          }}
        >
          <span>{formatTime(message.created_at)}</span>
          <span style={{ letterSpacing: 0.4 }}>{statusGlyph(message, mine)}</span>
        </div>
      </div>
    </div>
  )
}
