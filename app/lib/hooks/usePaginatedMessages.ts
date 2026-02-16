"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

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
      if (!mapRef.current.has(m.id)) {
        mapRef.current.set(m.id, m)
        changed = true
      } else {
        // optional: update existing message (e.g. read_at changes)
        const existing = mapRef.current.get(m.id)!
        // minimal merge:
        if (existing.read_at !== m.read_at) {
          mapRef.current.set(m.id, { ...existing, read_at: m.read_at })
          changed = true
        }
      }
    }
    if (changed) setVersion(v => v + 1)
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

    // Newest first, limit, then merge
    const { data, error } = await supabase
      .from("messages")
      .select("id, request_id, sender_id, content, created_at, read_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE)

    if (!error && data) {
      mergeMessages(data)
      setHasMore(data.length === PAGE_SIZE)

      // oldest cursor needs to reflect *after* merge
      setOldestCursorFromCurrent()
    } else {
      // handle error (toast/log)
      setHasMore(false)
    }

    setLoadingInitial(false)
  }, [mergeMessages, requestId, setOldestCursorFromCurrent])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    const cursor = oldestCursorRef.current
    if (!cursor) return

    setLoadingMore(true)

    // "Good enough" version: created_at < cursor.created_at
    // plus dedupe. If you want perfect tie-break handling, use RPC below.
    const { data, error } = await supabase
      .from("messages")
      .select("id, request_id, sender_id, content, created_at, read_at")
      .eq("request_id", requestId)
      .lt("created_at", cursor.created_at)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE)

    if (!error && data) {
      mergeMessages(data)
      setHasMore(data.length === PAGE_SIZE)
      setOldestCursorFromCurrent()
    } else {
      setHasMore(false)
    }

    setLoadingMore(false)
  }, [hasMore, loadingMore, mergeMessages, requestId, setOldestCursorFromCurrent])

  // Realtime INSERT merge
  useEffect(() => {
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
      mapRef.current.clear()
      oldestCursorRef.current = null
      setVersion(v => v + 1)
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
