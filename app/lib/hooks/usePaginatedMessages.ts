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

  attachment_type?: string | null
  attachment_bucket?: string | null
  attachment_path?: string | null
  attachment_content_type?: string | null
  attachment_size_bytes?: number | null
  attachment_width?: number | null
  attachment_height?: number | null
}

export type UIMessage = Message & {
  client_status?: "pending" | "sent" | "error"
  attachment_url?: string | null
}

const PAGE_SIZE = 40
const DEFAULT_BUCKET = "message-attachments"
const SIGNED_URL_TTL_SECONDS = 60 * 10 // 10 minutes

function compareAsc(a: UIMessage, b: UIMessage) {
  if (a.created_at < b.created_at) return -1
  if (a.created_at > b.created_at) return 1
  return a.id.localeCompare(b.id)
}

function tempId() {
  return `temp-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`
}

function normalizeImageMime(mime: string) {
  const m = (mime || "").toLowerCase().trim()
  if (m === "image/jpg") return "image/jpeg"
  return m
}

function extFromMime(mime: string) {
  const m = normalizeImageMime(mime)
  if (m === "image/jpeg") return "jpg"
  if (m === "image/png") return "png"
  if (m === "image/webp") return "webp"
  if (m === "image/gif") return "gif"
  return "bin"
}

function safeMsg(err: any) {
  return (
    err?.message ||
    err?.error_description ||
    err?.hint ||
    err?.details ||
    (typeof err === "string" ? err : null) ||
    "Unknown error"
  )
}

export function usePaginatedMessages(requestId: string) {
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const mapRef = useRef<Map<string, UIMessage>>(new Map())
  const [version, setVersion] = useState(0)
  const oldestCursorRef = useRef<{ created_at: string; id: string } | null>(null)

  const signedCacheRef = useRef<Map<string, { url: string; expMs: number }>>(new Map())
  const signingInFlightRef = useRef<Set<string>>(new Set())

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const messages = useMemo(() => {
    const arr = Array.from(mapRef.current.values())
    arr.sort(compareAsc)
    return arr
  }, [version])

  const maybeHydrateSignedUrl = useCallback(
    async (m: UIMessage) => {
      const bucket = (m.attachment_bucket ?? DEFAULT_BUCKET).trim() || DEFAULT_BUCKET
      const path = (m.attachment_path ?? "").trim()
      if (!path) return

      const key = `${bucket}:${path}`
      const cached = signedCacheRef.current.get(key)
      const now = Date.now()

      if (cached && cached.expMs > now + 10_000) {
        const existing = mapRef.current.get(m.id)
        if (existing && existing.attachment_url !== cached.url) {
          mapRef.current.set(m.id, { ...existing, attachment_url: cached.url })
          bump()
        }
        return
      }

      if (signingInFlightRef.current.has(key)) return
      signingInFlightRef.current.add(key)

      try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
        if (error || !data?.signedUrl) return

        signedCacheRef.current.set(key, { url: data.signedUrl, expMs: now + SIGNED_URL_TTL_SECONDS * 1000 })

        const existing = mapRef.current.get(m.id)
        if (existing) {
          mapRef.current.set(m.id, { ...existing, attachment_url: data.signedUrl })
          bump()
        }
      } finally {
        signingInFlightRef.current.delete(key)
      }
    },
    [bump]
  )

  const mergeMessages = useCallback(
    (msgs: UIMessage[]) => {
      let changed = false

      for (const m of msgs) {
        const existing = mapRef.current.get(m.id)
        if (!existing) {
          mapRef.current.set(m.id, m)
          changed = true
        } else {
          const next: UIMessage = {
            ...existing,
            ...m,
            read_at: m.read_at ?? existing.read_at,
            client_status:
              existing.client_status === "pending" ? (m.client_status ?? "sent") : (m.client_status ?? existing.client_status),
            attachment_url: existing.attachment_url ?? m.attachment_url ?? null,
          }

          if (
            next.read_at !== existing.read_at ||
            next.content !== existing.content ||
            next.client_status !== existing.client_status ||
            next.attachment_path !== existing.attachment_path ||
            next.attachment_type !== existing.attachment_type ||
            next.attachment_url !== existing.attachment_url
          ) {
            mapRef.current.set(m.id, next)
            changed = true
          }
        }
      }

      if (changed) bump()

      for (const m of msgs) {
        if (m.attachment_type === "image" && m.attachment_path) void maybeHydrateSignedUrl(m)
      }
    },
    [bump, maybeHydrateSignedUrl]
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

  const baseSelect =
    "id, request_id, sender_id, content, created_at, read_at, client_temp_id, attachment_type, attachment_bucket, attachment_path, attachment_content_type, attachment_size_bytes, attachment_width, attachment_height"

  const loadInitial = useCallback(async () => {
    if (!requestId) return
    setLoadingInitial(true)

    const { data, error } = await supabase
      .from("messages")
      .select(baseSelect)
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

    mergeMessages((data ?? []).map((m) => ({ ...(m as any), client_status: "sent" })))
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
      .select(baseSelect)
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

    mergeMessages((data ?? []).map((m) => ({ ...(m as any), client_status: "sent" })))
    setHasMore((data ?? []).length === PAGE_SIZE)
    setOldestCursorFromCurrent()
    setLoadingMore(false)
  }, [hasMore, loadingMore, mergeMessages, requestId, setOldestCursorFromCurrent])

  const sendOptimistic = useCallback(
    async (senderId: string, content: string): Promise<{ ok: boolean; tempId?: string; errorMessage?: string }> => {
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
        const em = safeMsg(error)
        const existing = mapRef.current.get(tId)
        if (existing) {
          mapRef.current.set(tId, { ...existing, client_status: "error", content: `Send failed: ${em}` })
          bump()
        }
        return { ok: false, tempId: tId, errorMessage: em }
      }

      return { ok: true, tempId: tId }
    },
    [bump, requestId]
  )

  const sendOptimisticWithImage = useCallback(
    async (
      senderId: string,
      content: string,
      file: File,
      opts?: { bucket?: string }
    ): Promise<{ ok: boolean; tempId?: string; attachmentPath?: string; errorMessage?: string }> => {
      const tId = tempId()
      const nowIso = new Date().toISOString()

      const bucket = (opts?.bucket ?? DEFAULT_BUCKET).trim() || DEFAULT_BUCKET

      const normalizedType = normalizeImageMime(file.type || "application/octet-stream")
      const ext = extFromMime(normalizedType)

      if (!requestId) {
        const em = "Missing requestId"
        return { ok: false, tempId: tId, errorMessage: em }
      }

      const attachmentPath = `${requestId}/${tId}_${senderId}.${ext}`

      console.log("[pmp] upload", { bucket, attachmentPath, requestId, fileType: file.type, normalizedType, size: file.size })

      mapRef.current.set(tId, {
        id: tId,
        request_id: requestId,
        sender_id: senderId,
        content,
        created_at: nowIso,
        read_at: null,
        client_temp_id: tId,
        client_status: "pending",

        attachment_type: "image",
        attachment_bucket: bucket,
        attachment_path: attachmentPath,
        attachment_content_type: normalizedType,
        attachment_size_bytes: file.size,
        attachment_url: null,
      })
      bump()

      const { error: upErr } = await supabase.storage.from(bucket).upload(attachmentPath, file, {
        contentType: normalizedType,
        upsert: false,
      })

      if (upErr) {
        console.error("[pmp] upload error:", upErr)
        const em = safeMsg(upErr)
        const existing = mapRef.current.get(tId)
        if (existing) {
          mapRef.current.set(tId, { ...existing, client_status: "error", content: `Upload failed: ${em}` })
          bump()
        }
        return { ok: false, tempId: tId, attachmentPath, errorMessage: em }
      }

      const { error: insErr } = await supabase.from("messages").insert({
        request_id: requestId,
        sender_id: senderId,
        content,
        client_temp_id: tId,

        attachment_type: "image",
        attachment_bucket: bucket,
        attachment_path: attachmentPath,
        attachment_content_type: normalizedType,
        attachment_size_bytes: file.size,
      })

      if (insErr) {
        console.error("[pmp] insert w/attachment error:", insErr)
        const em = safeMsg(insErr)

        await supabase.storage.from(bucket).remove([attachmentPath]).catch(() => {})

        const existing = mapRef.current.get(tId)
        if (existing) {
          mapRef.current.set(tId, { ...existing, client_status: "error", content: `Send failed: ${em}` })
          bump()
        }

        return { ok: false, tempId: tId, attachmentPath, errorMessage: em }
      }

      return { ok: true, tempId: tId, attachmentPath }
    },
    [bump, requestId]
  )

  const retryOptimistic = useCallback(
    async (tempMessageId: string) => {
      const msg = mapRef.current.get(tempMessageId)
      if (!msg) return
      if (!msg.sender_id) return

      if (msg.attachment_type === "image") {
        mapRef.current.set(tempMessageId, { ...msg, client_status: "error" })
        bump()
        return
      }

      if (!msg.content) return

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
        const em = safeMsg(error)
        mapRef.current.set(tempMessageId, { ...msg, client_status: "error", content: `Send failed: ${em}` })
        bump()
      }
    },
    [bump, requestId]
  )

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

          if (row.client_temp_id && mapRef.current.has(row.client_temp_id)) {
            const temp = mapRef.current.get(row.client_temp_id)!
            mapRef.current.delete(row.client_temp_id)
            mapRef.current.set(row.id, { ...temp, ...(row as any), client_status: "sent" })
            bump()
            setOldestCursorFromCurrent()

            if (row.attachment_type === "image" && row.attachment_path) void maybeHydrateSignedUrl({ ...(row as any), client_status: "sent" })
            return
          }

          mergeMessages([{ ...(row as any), client_status: "sent" }])
          setOldestCursorFromCurrent()
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          mergeMessages([{ ...((payload.new as Message) as any), client_status: "sent" }])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, loadInitial, mergeMessages, reset, bump, setOldestCursorFromCurrent, maybeHydrateSignedUrl])

  return {
    messages,
    loadingInitial,
    loadingMore,
    hasMore,
    loadMore,
    sendOptimistic,
    sendOptimisticWithImage,
    retryOptimistic,
  }
}