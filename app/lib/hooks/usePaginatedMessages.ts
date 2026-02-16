"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/app/lib/supabaseClient" // ✅ matches your repo tree

export type Message = {
  id: string
  request_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}

const PAGE_SIZE = 40

function compareAsc(a: Message, b: Message) {
  // stable ordering: created_at then id
  if (a.created_at < b.created_at) return -1
  if (a.created_at > b.created_at) return 1
  return a.id.localeCompare(b.id)
}

export function usePaginatedMessages(requestId: string) {
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Source of truth (dedupe)
  const mapRef = useRef<Map<string, Message>>(new Map())
  const [version, setVersion] = useState(0) // trigger re-render when map changes

  // Cursor = oldest message currently loaded
  const oldestCursorRef = useRef<{ created_at: string; id: string } | null>(null)

  const messages = useMemo(() => {
    const arr = Array.from(mapRef.current.values())
    arr.sort(compareAsc)
    return arr
  }, [version])

  const mergeMessages = useCallback((msgs: Message[]) => {
    let changed = false

    for (const m of msgs) {
      const existing = mapRef.current.get(m.id)

      if (!existing) {
        mapRef.current.set(m.id, m)
        changed = true
        continue
      }

      // Minimal merge for fields that can change (ex: read_at)
      if (existing.read_at !== m.read_at) {
        mapRef.current.set(m.id, { ...existing, read_at: m.read_at })
        changed = true
      }
    }

    if (changed) setVersion((v) => v + 1)
  }, [])

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

    mergeMessages((data ?? []) as Message[])
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
      .lt("created_at", cursor.created_at) // (good enough) + dedupe
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE)

    if (error) {
      console.error("loadMore messages error:", error)
      setHasMore(false)
      setLoadingMore(false)
      return
    }

    mergeMessages((data ?? []) as Message[])
    setHasMore((data ?? []).length === PAGE_SIZE)
    setOldestCursorFromCurrent()

    setLoadingMore(false)
  }, [hasMore, loadingMore, mergeMessages, requestId, setOldestCursorFromCurrent])

  // Realtime INSERT merge
  useEffect(() => {
    if (!requestId) return

    // reset local state when requestId changes
    mapRef.current = new Map()
    oldestCursorRef.current = null
    setHasMore(true)
    setVersion((v) => v + 1)

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
          mergeMessages([payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, loadInitial, mergeMessages])

  return {
    messages,
    loadingInitial,
    loadingMore,
    hasMore,
    loadMore,
  }
}
