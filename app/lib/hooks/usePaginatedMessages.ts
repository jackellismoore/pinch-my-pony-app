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
  client_temp_id?: string // temp id to map optimistic -> real insert
}

const PAGE_SIZE = 40

function compareAsc(a: UIMessage, b: UIMessage) {
  if (a.created_at < b.created_at) return -1
  if (a.created_at > b.created_at) return 1
  return a.id.localeCompare(b.id)
}

function makeTempId() {
  return `temp-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

export function usePaginatedMessages(requestId: string) {
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // source of truth
  const mapRef = useRef<Map<string, UIMessage>>(new Map())
  const [version, setVersion] = useState(0)
  const oldestCursorRef = useRef<{ created_at: string; id: string } | null>(null)

  // Map: client_temp_id -> temp message id (our map key)
  const tempKeyByClientTempRef = useRef<Map<string, string>>(new Map())

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const messages = useMemo(() => {
    const arr = Array.from(mapRef.current.values())
    arr.sort(compareAsc)
    return arr
  }, [version])

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
    tempKeyByClientTempRef.current = new Map()
    oldestCursorRef.current = null
    setHasMore(true)
    bump()
  }, [bump])

  // merge from server and reconcile optimistic messages
  const mergeServerMessages = useCallback(
    (msgs: UIMessage[]) => {
      let changed = false

      for (const m of msgs) {
        // ✅ If server message has client_temp_id, try to replace the temp bubble
        const clientTemp = m.client_temp_id
        if (clientTemp) {
          const tempKey = tempKeyByClientTempRef.current.get(clientTemp)
          if (tempKey && mapRef.current.has(tempKey)) {
            mapRef.current.delete(tempKey)
            tempKeyByClientTempRef.current.delete(clientTemp)
            changed = true
          }
        }

        const existing = mapRef.current.get(m.id)
        if (!existing) {
          mapRef.current.set(m.id, { ...m, client_status: "sent" })
          changed = true
          continue
        }

        const next: UIMessage = {
          ...existing,
          ...m,
          read_at: m.read_at ?? existing.read_at,
          client_status: "sent",
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

      if (changed) {
        bump()
        setOldestCursorFromCurrent()
      }
    },
    [bump, setOldestCursorFromCurrent]
  )

  const loadInitial = useCallback(async () => {
    if (!requestId) return
    setLoadingInitial(true)

    const { data, error } = await supabase
      .from("messages")
      .select("id, request_id, sender_id, content, created_at, read_at, client_temp_id")
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

    mergeServerMessages((data ?? []) as any)
    setHasMore((data ?? []).length === PAGE_SIZE)
    setOldestCursorFromCurrent()
    setLoadingInitial(false)
  }, [mergeServerMessages, requestId, setOldestCursorFromCurrent])

  const loadMore = useCallback(async () => {
    if (!requestId) return
    if (loadingMore || !hasMore) return
    const cursor = oldestCursorRef.current
    if (!cursor) return

    setLoadingMore(true)

    const { data, error } = await supabase
      .from("messages")
      .select("id, request_id, sender_id, content, created_at, read_at, client_temp_id")
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

    mergeServerMessages((data ?? []) as any)
    setHasMore((data ?? []).length === PAGE_SIZE)
    setOldestCursorFromCurrent()
    setLoadingMore(false)
  }, [hasMore, loadingMore, mergeServerMessages, requestId, setOldestCursorFromCurrent])

  // ✅ Optimistic send API
  const sendOptimistic = useCallback(
    async (sender_id: string, content: string) => {
      if (!requestId) return { ok: false as const }

      const tempId = makeTempId()
      const client_temp_id = makeTempId() // separate correlation id

      const nowIso = new Date().toISOString()

      const optimistic: UIMessage = {
        id: tempId,
        request_id: requestId,
        sender_id,
        content,
        created_at: nowIso,
        read_at: null,
        client_status: "pending",
        client_temp_id,
      }

      mapRef.current.set(tempId, optimistic)
      tempKeyByClientTempRef.current.set(client_temp_id, tempId)
      bump()
      setOldestCursorFromCurrent()

      const { error } = await supabase.from("messages").insert({
        request_id: requestId,
        sender_id,
        content,
        client_temp_id, // ✅ important for reconciliation
      })

      if (error) {
        // mark as error
        const existing = mapRef.current.get(tempId)
        if (existing) {
          mapRef.current.set(tempId, { ...existing, client_status: "error" })
          bump()
        }
        return { ok: false as const, tempId, client_temp_id, error }
      }

      // Keep pending until server INSERT arrives via realtime, then it'll replace it.
      // Fallback: mark as sent after short delay if realtime is slow
      window.setTimeout(() => {
        const still = mapRef.current.get(tempId)
        if (still && still.client_status === "pending") {
          mapRef.current.set(tempId, { ...still, client_status: "sent" })
          bump()
        }
      }, 2000)

      return { ok: true as const, tempId, client_temp_id }
    },
    [bump, requestId, setOldestCursorFromCurrent]
  )

  const retryOptimistic = useCallback(
    async (tempId: string) => {
      const existing = mapRef.current.get(tempId)
      if (!existing) return { ok: false as const }

      // revert to pending
      mapRef.current.set(tempId, { ...existing, client_status: "pending" })
      bump()

      const client_temp_id = existing.client_temp_id ?? makeTempId()
      tempKeyByClientTempRef.current.set(client_temp_id, tempId)

      const { error } = await supabase.from("messages").insert({
        request_id: existing.request_id,
        sender_id: existing.sender_id,
        content: existing.content,
        client_temp_id,
      })

      if (error) {
        mapRef.current.set(tempId, { ...existing, client_status: "error", client_temp_id })
        bump()
        return { ok: false as const, error }
      }

      // wait for realtime to reconcile
      return { ok: true as const }
    },
    [bump]
  )

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
          mergeServerMessages([payload.new as any])
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          mergeServerMessages([payload.new as any])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, loadInitial, mergeServerMessages, reset])

  return {
    messages,
    loadingInitial,
    loadingMore,
    hasMore,
    loadMore,
    sendOptimistic,
    retryOptimistic,
  }
}
