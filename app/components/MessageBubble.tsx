"use client"

import { useEffect, useMemo, useState } from "react"

type UIMessage = {
  id: string
  request_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  client_status?: "pending" | "sent" | "error"
  delivered_at?: string | null

  // NEW
  attachment_type?: string | null
  attachment_url?: string | null
  attachment_path?: string | null
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
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const bg =
  message.client_status === "error"
    ? "rgba(239,68,68,0.12)"
    : mine
      ? "linear-gradient(180deg, rgba(11,59,46,0.96), rgba(15,23,42,0.92))" // forest -> navy
      : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(245,241,232,0.78))" // cream card

const fg = mine ? "white" : "var(--pmp-navy)"

  const hasImage = message.attachment_type === "image" && (message.attachment_url || message.attachment_path)

  const bubbleBorder = mine ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(15,23,42,0.10)"
  
  const imageBoxStyle: React.CSSProperties = useMemo(
    () => ({
      marginTop: message.content?.trim() ? 10 : 2,
      borderRadius: 14,
      overflow: "hidden",
      border: mine ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(15,23,42,0.10)",
      background: mine ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.04)",
      boxShadow: "0 10px 20px rgba(0,0,0,0.10)",
      cursor: message.attachment_url ? "pointer" : "default",
      maxWidth: 360,
    }),
    [mine, message.attachment_url, message.content]
  )

  return (
    <>
      <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
        <div
          style={{
            maxWidth: 560,
            padding: "10px 12px",
            ...radius(mine, groupPos),
            background: bg,
            color: fg,
            border: bubbleBorder,
            boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
            wordBreak: "break-word",
            opacity: message.client_status === "pending" ? 0.82 : 1,
          }}
        >
          {message.content?.trim() ? <div style={{ fontSize: 14, lineHeight: 1.45 }}>{message.content}</div> : null}

          {hasImage ? (
            <div
              style={imageBoxStyle}
              onClick={() => {
                if (message.attachment_url) setOpen(true)
              }}
              role={message.attachment_url ? "button" : undefined}
              aria-label={message.attachment_url ? "Open image" : "Image"}
              title={message.attachment_url ? "Click to view" : "Loading image…"}
            >
              {message.attachment_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.attachment_url}
                  alt="Attachment"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    maxHeight: 260,
                    objectFit: "cover",
                    transform: "translateZ(0)",
                  }}
                />
              ) : (
                <div style={{ padding: 12, fontSize: 12, opacity: 0.85 }}>
                  {message.client_status === "pending" ? "Uploading…" : "Loading image…"}
                </div>
              )}
            </div>
          ) : null}

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

      {/* Lightweight image modal */}
      {open && message.attachment_url ? (
        <div
          onMouseDown={(e) => {
            // click outside closes
            if (e.target === e.currentTarget) setOpen(false)
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15,23,42,0.60)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            animation: "pmpFadeInUp 140ms ease-out",
          }}
          aria-modal="true"
          role="dialog"
        >
          <div
            style={{
              width: "min(980px, 100%)",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.08)",
              boxShadow: "0 26px 80px rgba(0,0,0,0.35)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 44,
                height: 44,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(15,23,42,0.40)",
                color: "white",
                cursor: "pointer",
                fontWeight: 950,
                boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
              }}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.attachment_url}
              alt="Attachment full view"
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                maxHeight: "85vh",
                objectFit: "contain",
                background: "rgba(15,23,42,0.35)",
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}