"use client"

import { useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { usePaginatedMessages } from "@/app/lib/hooks/usePaginatedMessages"
import MessageBubble from "@/app/components/MessageBubble"
import TypingBubbleInline from "@/app/components/TypingBubbleInline"

export default function MessageThreadPage() {
  const { requestId } = useParams() as { requestId: string }

  const {
    messages,
    loadMore,
    hasMore,
    loadingMore,
  } = usePaginatedMessages(requestId)

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)

  // Infinite scroll
  useEffect(() => {
    const sentinel = topSentinelRef.current
    const scroller = scrollerRef.current
    if (!sentinel || !scroller) return

    const obs = new IntersectionObserver(
      async (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        if (!hasMore || loadingMore) return

        const prevScrollHeight = scroller.scrollHeight
        const prevScrollTop = scroller.scrollTop

        await loadMore()

        requestAnimationFrame(() => {
          const newScrollHeight = scroller.scrollHeight
          scroller.scrollTop =
            prevScrollTop + (newScrollHeight - prevScrollHeight)
        })
      },
      { root: scroller, threshold: 0.1 }
    )

    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loadMore])

  // Scroll to bottom on first load
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTop = scroller.scrollHeight
  }, [])

  return (
    <div
      ref={scrollerRef}
      style={{
        height: "calc(100vh - 140px)",
        overflowY: "auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div ref={topSentinelRef} style={{ height: 1 }} />

      {hasMore && (
        <div
          style={{
            textAlign: "center",
            opacity: 0.7,
            fontSize: 12,
            padding: 8,
          }}
        >
          {loadingMore ? "Loading..." : "Scroll up for older messages"}
        </div>
      )}

      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}

      <TypingBubbleInline />
    </div>
  )
}
