"use client"

import { useEffect } from "react"

export default function TypingBubbleInline({ show }: { show: boolean }) {
  useEffect(() => {
    const id = "pinch-typing-keyframes"
    if (document.getElementById(id)) return
    const style = document.createElement("style")
    style.id = id
    style.innerHTML = `
      @keyframes pinchTypingBounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.55; }
        40% { transform: translateY(-4px); opacity: 1; }
      }
    `
    document.head.appendChild(style)
  }, [])

  if (!show) return null

  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 12px",
          borderRadius: 16,
          background: "rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
        }}
        aria-label="Typing…"
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(0,0,0,0.65)", animation: "pinchTypingBounce 1.2s infinite" }} />
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(0,0,0,0.65)", animation: "pinchTypingBounce 1.2s infinite", animationDelay: "0.15s" }} />
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(0,0,0,0.65)", animation: "pinchTypingBounce 1.2s infinite", animationDelay: "0.3s" }} />
      </div>
    </div>
  )
}
