"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export type Message = {
  id: string
  request_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}

export type UIMessage = Message & {
  client_status?: "pending" | "sent" | "error"
}

const PAGE_SIZE = 40

function compareAsc(a: UIMessage, b: UIMessage) {
  if (a.created_at < b.created_at) return -1
  if (a.created_at > b.created_at) return 1
  return a.id.localeCompare(b.id)
}

export function usePaginatedMessages(requestId: string) {
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const mapRef = useRef<Map<string, UIMessage>>(new Map())
  const [version, setVersion] = useState(0)
  const oldestCursorRef = useRef<{ created_at: string; id: string } | null>(null)

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const messages = useMemo(() => {
    const arr = Array.from(mapRef.current.values())
    arr.sort(compareAsc)
    return arr
  }, [version])

  const mergeMessages = useCallback(
    (msgs: UIMessage[]) => {
      let changed = false

      for (const m of msgs) {
        const existing = mapRef.current.get(m.id)
        if (!existing) {
          mapRef.current.set(m.id, m)
          changed = true
          continue
        }

        // Merge updates (esp read_at)
        const next: UIMessage = {
          ...existing,
          ...m,
          read_at: m.read_at ?? existing.read_at,
          client_status: existing.client_status === "pending" ? (m.client_status ?? "sent") : (m.client_status ?? existing.client_status),
        }

        if (
          next.read_at !== existing.read_at ||
          next.content !== existing.content ||
          next.client_status !== existing.client_status
        ) {
          mapRef.current.set(m.id, next)
          changed = true
        }
      }

      if (changed) bump()
    },
    [bump]
  )

  const setOldestCursorFromCurrent = useCallback(() => {
    const arr = Array.from(mapRef.current.values())
    if (arr.length === 0) {
      oldestCursorRef.current = null
      return
    }
    arr.sort(compareAsc)
    const oldest = arr[0]
    oldestCursorRef.current = { created_at: oldest.created_at, id: oldest.id }
  }, [])

  const reset = useCallback(() => {
    mapRef.current = new Map()
    oldestCursorRef.current = null
    setHasMore(true)
    bump()
  }, [bump])

  const loadInitial = useCallback(async () => {
    setLoadingInitial(true)

    const { data, error } = await supabase
      .from("messages")
      .select("id, request_id, sender_id, content, created_at, read_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE)

    if (error) {
      console.error("loadInitial messages error:", error)
      setHasMore(false)
      setLoadingInitial(false)
      return
    }

    mergeMessages((data ?? []).map((m) => ({ ...m, client_status: "sent" })))
    setHasMore((data ?? []).length === PAGE_SIZE)
    setOldestCursorFromCurrent()

    setLoadingInitial(false)
  }, [mergeMessages, requestId, setOldestCursorFromCurrent])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    const cursor = oldestCursorRef.current
    if (!cursor) return

    setLoadingMore(true)

    const { data, error } = await supabase
      .from("messages")
      .select("id, request_id, sender_id, content, created_at, read_at")
      .eq("request_id", requestId)
      .lt("created_at", cursor.created_at)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE)

    if (error) {
      console.error("loadMore messages error:", error)
      setHasMore(false)
      setLoadingMore(false)
      return
    }

    mergeMessages((data ?? []).map((m) => ({ ...m, client_status: "sent" })))
    setHasMore((data ?? []).length === PAGE_SIZE)
    setOldestCursorFromCurrent()

    setLoadingMore(false)
  }, [hasMore, loadingMore, mergeMessages, requestId, setOldestCursorFromCurrent])

  useEffect(() => {
    if (!requestId) return

    reset()
    loadInitial()

    const channel = supabase
      .channel(`messages:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          mergeMessages([{ ...(payload.new as Message), client_status: "sent" }])
        }
      )
      // ✅ IMPORTANT: read receipts are UPDATEs
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          mergeMessages([{ ...(payload.new as Message), client_status: "sent" }])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, loadInitial, mergeMessages, reset])

  return {
    messages,
    loadingInitial,
    loadingMore,
    hasMore,
    loadMore,
  }
}
