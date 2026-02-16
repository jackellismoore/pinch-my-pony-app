"use client"

type UIMessage = {
  id: string
  request_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  client_status?: "pending" | "sent" | "error"
  delivered_at?: string | null
}

type GroupPos = "single" | "start" | "middle" | "end"

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function radius(isMine: boolean, pos: GroupPos) {
  const r = 16
  const tight = 8

  if (pos === "single") return { borderRadius: r }

  if (isMine) {
    if (pos === "start")
      return { borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomRightRadius: tight, borderBottomLeftRadius: r }
    if (pos === "middle")
      return { borderTopLeftRadius: r, borderTopRightRadius: tight, borderBottomRightRadius: tight, borderBottomLeftRadius: r }
    return { borderTopLeftRadius: r, borderTopRightRadius: tight, borderBottomRightRadius: r, borderBottomLeftRadius: r }
  } else {
    if (pos === "start")
      return { borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomRightRadius: r, borderBottomLeftRadius: tight }
    if (pos === "middle")
      return { borderTopLeftRadius: tight, borderTopRightRadius: r, borderBottomRightRadius: r, borderBottomLeftRadius: tight }
    return { borderTopLeftRadius: tight, borderTopRightRadius: r, borderBottomRightRadius: r, borderBottomLeftRadius: r }
  }
}

function statusText(m: UIMessage) {
  if (m.client_status === "pending") return "⏳"
  if (m.client_status === "error") return "⚠"
  // read has priority
  if (m.read_at) return "✓✓"
  if (m.delivered_at) return "✓✓"
  return "✓"
}

export default function MessageBubble({
  message,
  isMine,
  groupPos = "single",
  showStatus = false,
  onRetry,
}: {
  message: UIMessage
  isMine: boolean
  groupPos?: GroupPos
  showStatus?: boolean
  onRetry?: (tempId: string) => void
}) {
  const mine = Boolean(isMine)

  const bg =
    message.client_status === "error"
      ? "rgba(239,68,68,0.12)"
      : mine
        ? "rgba(37,99,235,0.92)"
        : "rgba(255,255,255,0.86)"

  const fg = mine ? "white" : "#0f172a"

  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: 560,
          padding: "10px 12px",
          ...radius(mine, groupPos),
          background: bg,
          color: fg,
          border: mine ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
          wordBreak: "break-word",
          opacity: message.client_status === "pending" ? 0.82 : 1,
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
            opacity: 0.72,
            alignItems: "center",
          }}
        >
          <span>{formatTime(message.created_at)}</span>
          {mine && showStatus ? <span style={{ letterSpacing: 0.5 }}>{statusText(message)}</span> : null}
        </div>

        {message.client_status === "error" && mine ? (
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => onRetry?.(message.id)}
              style={{
                border: "none",
                background: "rgba(239,68,68,0.14)",
                color: fg,
                fontWeight: 900,
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
