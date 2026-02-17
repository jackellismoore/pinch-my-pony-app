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
  client_temp_id?: string | null
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

function tempId() {
  return `temp-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`
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

        const next: UIMessage = {
          ...existing,
          ...m,
          read_at: m.read_at ?? existing.read_at,
          client_status:
            existing.client_status === "pending" ? (m.client_status ?? "sent") : (m.client_status ?? existing.client_status),
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

    mergeMessages((data ?? []).map((m) => ({ ...m, client_status: "sent" })))
    setHasMore((data ?? []).length === PAGE_SIZE)
    setOldestCursorFromCurrent()
    setLoadingInitial(false)
  }, [mergeMessages, requestId, setOldestCursorFromCurrent])

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

    mergeMessages((data ?? []).map((m) => ({ ...m, client_status: "sent" })))
    setHasMore((data ?? []).length === PAGE_SIZE)
    setOldestCursorFromCurrent()
    setLoadingMore(false)
  }, [hasMore, loadingMore, mergeMessages, requestId, setOldestCursorFromCurrent])

  // ---- Optimistic send with reconciliation via client_temp_id ----
  const sendOptimistic = useCallback(
    async (senderId: string, content: string): Promise<{ ok: boolean; tempId?: string }> => {
      const tId = tempId()
      const nowIso = new Date().toISOString()

      mapRef.current.set(tId, {
        id: tId,
        request_id: requestId,
        sender_id: senderId,
        content,
        created_at: nowIso,
        read_at: null,
        client_temp_id: tId,
        client_status: "pending",
      })
      bump()

      const { error } = await supabase.from("messages").insert({
        request_id: requestId,
        sender_id: senderId,
        content,
        client_temp_id: tId,
      })

      if (error) {
        console.error("sendOptimistic insert error:", error)
        const existing = mapRef.current.get(tId)
        if (existing) {
          mapRef.current.set(tId, { ...existing, client_status: "error" })
          bump()
        }
        return { ok: false, tempId: tId }
      }

      return { ok: true, tempId: tId }
    },
    [bump, requestId]
  )

  const retryOptimistic = useCallback(
    async (tempMessageId: string) => {
      const msg = mapRef.current.get(tempMessageId)
      if (!msg) return
      if (!msg.sender_id || !msg.content) return

      mapRef.current.set(tempMessageId, { ...msg, client_status: "pending" })
      bump()

      const { error } = await supabase.from("messages").insert({
        request_id: requestId,
        sender_id: msg.sender_id,
        content: msg.content,
        client_temp_id: msg.client_temp_id ?? tempMessageId,
      })

      if (error) {
        console.error("retryOptimistic insert error:", error)
        mapRef.current.set(tempMessageId, { ...msg, client_status: "error" })
        bump()
      }
    },
    [bump, requestId]
  )

  // ---- Realtime: INSERT + UPDATE ----
  useEffect(() => {
    if (!requestId) return

    reset()
    loadInitial()

    const channel = supabase
      .channel(`messages:${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          const row = payload.new as Message

          // Reconcile optimistic temp id if present
          if (row.client_temp_id && mapRef.current.has(row.client_temp_id)) {
            const temp = mapRef.current.get(row.client_temp_id)!
            mapRef.current.delete(row.client_temp_id)
            mapRef.current.set(row.id, {
              ...temp,
              ...row,
              client_status: "sent",
            })
            bump()
            setOldestCursorFromCurrent()
            return
          }

          mergeMessages([{ ...row, client_status: "sent" }])
          setOldestCursorFromCurrent()
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          mergeMessages([{ ...(payload.new as Message), client_status: "sent" }])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, loadInitial, mergeMessages, reset, bump, setOldestCursorFromCurrent])

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
