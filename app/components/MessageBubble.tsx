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
  const r = 18
  const tight = 10

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

  const hasImage = message.attachment_type === "image" && (message.attachment_url || message.attachment_path)

  const bg =
    message.client_status === "error"
      ? "linear-gradient(180deg, rgba(239,68,68,0.14), rgba(239,68,68,0.08))"
      : mine
        ? "linear-gradient(180deg, rgba(11,59,46,0.96), rgba(15,23,42,0.92))"
        : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(245,241,232,0.78))"

  const fg = mine ? "white" : "#0f172a"

  const bubbleBorder =
    message.client_status === "error"
      ? "1px solid rgba(239,68,68,0.22)"
      : mine
        ? "1px solid rgba(255,255,255,0.16)"
        : "1px solid rgba(15,23,42,0.10)"

  const imageBoxStyle: React.CSSProperties = useMemo(
    () => ({
      marginTop: message.content?.trim() ? 10 : 2,
      borderRadius: 16,
      overflow: "hidden",
      border: mine ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(15,23,42,0.10)",
      background: mine ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.04)",
      boxShadow: "0 14px 28px rgba(0,0,0,0.12)",
      cursor: message.attachment_url ? "pointer" : "default",
      maxWidth: 360,
      transition: "transform 140ms ease, box-shadow 140ms ease",
    }),
    [mine, message.attachment_url, message.content]
  )

  return (
    <>
      <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
        <div
          style={{
            maxWidth: 580,
            padding: "10px 12px",
            ...radius(mine, groupPos),
            background: bg,
            color: fg,
            border: bubbleBorder,
            boxShadow: "0 14px 30px rgba(0,0,0,0.10)",
            wordBreak: "break-word",
            opacity: message.client_status === "pending" ? 0.86 : 1,
          }}
        >
          {message.content?.trim() ? (
            <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{message.content}</div>
          ) : null}

          {hasImage ? (
            <div
              style={imageBoxStyle}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                if (!message.attachment_url) return
                el.style.transform = "scale(1.01)"
                el.style.boxShadow = "0 18px 34px rgba(0,0,0,0.16), 0 0 0 2px rgba(202,162,77,0.18)"
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.transform = "scale(1)"
                el.style.boxShadow = "0 14px 28px rgba(0,0,0,0.12)"
              }}
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
                    maxHeight: 280,
                    objectFit: "cover",
                    transform: "translateZ(0)",
                  }}
                />
              ) : (
                <div style={{ padding: 12 }}>
                  <div className="pmp-shimmer" style={{ height: 16, borderRadius: 10, width: "62%" }} />
                  <div style={{ height: 10 }} />
                  <div className="pmp-shimmer" style={{ height: 12, borderRadius: 10, width: "86%" }} />
                  <div style={{ height: 10 }} />
                  <div style={{ fontSize: 12, opacity: mine ? 0.85 : 0.75 }}>
                    {message.client_status === "pending" ? "Uploading…" : "Loading image…"}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 7,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              fontSize: 11,
              opacity: mine ? 0.70 : 0.62,
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
                  border: "1px solid rgba(255,255,255,0.20)",
                  background: "rgba(255,255,255,0.14)",
                  color: fg,
                  fontWeight: 950,
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {open && message.attachment_url ? (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15,23,42,0.62)",
            backdropFilter: "blur(7px)",
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
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.08)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.40)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setOpen(false)}
              className="pmp-hoverLift"
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
                boxShadow: "0 12px 26px rgba(0,0,0,0.28)",
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