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

// UI-only fields (not stored in DB)
export type UIMessage = Message & {
  client_status?: "pending" | "sent" | "error"
  client_temp_id?: string
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
  const tempToRealRef = useRef<Map<string, string>>(new Map()) // tempId -> realId
  const [version, setVersion] = useState(0)

  const oldestCursorRef = useRef<{ created_at: string; id: string } | null>(null)

  const messages = useMemo(() => {
    const arr = Array.from(mapRef.current.values())
    arr.sort(compareAsc)
    return arr
  }, [version])

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const mergeMessages = useCallback((msgs: UIMessage[]) => {
    let changed = false

    for (const m of msgs) {
      const existing = mapRef.current.get(m.id)

      if (!existing) {
        mapRef.current.set(m.id, m)
        changed = true
        continue
      }

      // merge read_at + status if needed
      const next: UIMessage = {
        ...existing,
        ...m,
        read_at: m.read_at ?? existing.read_at,
        client_status: existing.client_status === "pending" ? (m.client_status ?? "sent") : (m.client_status ?? existing.client_status),
      }

      // only set if changed
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
  }, [bump])

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

  const resetForRequest = useCallback(() => {
    mapRef.current = new Map()
    tempToRealRef.current = new Map()
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

    const normalized = (data ?? []).map((m) => ({ ...m, client_status: "sent" as const }))
    mergeMessages(normalized)
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
      .lt("created_at", cursor.created_at) // good enough + dedupe
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE)

    if (error) {
      console.error("loadMore messages error:", error)
      setHasMore(false)
      setLoadingMore(false)
      return
    }

    const normalized = (data ?? []).map((m) => ({ ...m, client_status: "sent" as const }))
    mergeMessages(normalized)
    setHasMore((data ?? []).length === PAGE_SIZE)
    setOldestCursorFromCurrent()

    setLoadingMore(false)
  }, [hasMore, loadingMore, mergeMessages, requestId, setOldestCursorFromCurrent])

  // --- Optimistic send ---
  const sendMessage = useCallback(
    async (senderId: string, content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return

      const nowIso = new Date().toISOString()
      const tempId = `temp-${crypto.randomUUID()}`
      const optimistic: UIMessage = {
        id: tempId,
        request_id: requestId,
        sender_id: senderId,
        content: trimmed,
        created_at: nowIso,
        read_at: null,
        client_status: "pending",
        client_temp_id: tempId,
      }

      mergeMessages([optimistic])

      const { data, error } = await supabase
        .from("messages")
        .insert({
          request_id: requestId,
          sender_id: senderId,
          content: trimmed,
        })
        .select("id, request_id, sender_id, content, created_at, read_at")
        .single()

      if (error || !data) {
        console.error("sendMessage insert error:", error)
        // mark optimistic as error
        const existing = mapRef.current.get(tempId)
        if (existing) {
          mapRef.current.set(tempId, { ...existing, client_status: "error" })
          bump()
        }
        return
      }

      // reconcile: replace temp id with real id
      tempToRealRef.current.set(tempId, data.id)

      // remove temp
      mapRef.current.delete(tempId)

      // add real
      mergeMessages([{ ...data, client_status: "sent" }])
    },
    [mergeMessages, requestId, bump]
  )

  // Realtime INSERT: merge + also reconcile if it matches a pending item by content+sender close in time
  useEffect(() => {
    if (!requestId) return

    resetForRequest()
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
          const incoming = payload.new as Message
          mergeMessages([{ ...incoming, client_status: "sent" }])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, loadInitial, mergeMessages, resetForRequest])

  return {
    messages,
    loadingInitial,
    loadingMore,
    hasMore,
    loadMore,
    sendMessage, // ✅ expose optimistic sender
  }
}
