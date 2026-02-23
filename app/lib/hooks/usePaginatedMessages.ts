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

  // ✅ attachments (nullable)
  attachment_type?: "image" | null
  attachment_bucket?: string | null
  attachment_path?: string | null
  attachment_content_type?: string | null
  attachment_size_bytes?: number | null
  attachment_width?: number | null
  attachment_height?: number | null
}

export type UIMessage = Message & {
  client_status?: "pending" | "sent" | "error"
  delivered_at?: string | null

  // ✅ derived for UI
  attachment_url?: string | null
  attachment_preview_url?: string | null // local blob preview (optimistic)
}

const PAGE_SIZE = 40
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

function compareAsc(a: UIMessage, b: UIMessage) {
  if (a.created_at < b.created_at) return -1
  if (a.created_at > b.created_at) return 1
  return a.id.localeCompare(b.id)
}

function tempId() {
  return `temp-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`
}

function extFromType(type: string) {
  const t = (type || "").toLowerCase()
  if (t === "image/jpeg" || t === "image/jpg") return "jpg"
  if (t === "image/png") return "png"
  if (t === "image/webp") return "webp"
  // fallback
  return "bin"
}

async function readImageDims(file: File): Promise<{ width: number; height: number } | null> {
  try {
    // Prefer createImageBitmap when available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyWin = window as any
    if (typeof anyWin.createImageBitmap === "function") {
      const bmp = await anyWin.createImageBitmap(file)
      const w = bmp.width
      const h = bmp.height
      try {
        bmp.close?.()
      } catch {}
      if (w && h) return { width: w, height: h }
    }

    // Fallback: HTMLImageElement
    const url = URL.createObjectURL(file)
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height })
      img.onerror = () => reject(new Error("Image decode failed"))
      img.src = url
    })
    URL.revokeObjectURL(url)
    return dims
  } catch {
    return null
  }
}

export function usePaginatedMessages(requestId: string) {
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const mapRef = useRef<Map<string, UIMessage>>(new Map())
  const [version, setVersion] = useState(0)
  const oldestCursorRef = useRef<{ created_at: string; id: string } | null>(null)

  // cache signed urls by "bucket|path"
  const signedCacheRef = useRef<Map<string, { url: string; expiresAt: number }>>(new Map())

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
    // Revoke any local blob previews to avoid leaks
    for (const m of mapRef.current.values()) {
      if (m.attachment_preview_url?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(m.attachment_preview_url)
        } catch {}
      }
    }

    mapRef.current = new Map()
    oldestCursorRef.current = null
    setHasMore(true)
    bump()
  }, [bump])

  const ensureSignedUrl = useCallback(
    async (m: UIMessage) => {
      const bucket = m.attachment_bucket
      const path = m.attachment_path
      if (!bucket || !path) return

      const key = `${bucket}|${path}`
      const now = Date.now()
      const cached = signedCacheRef.current.get(key)
      if (cached && cached.expiresAt > now + 15_000) {
        // already fresh
        const existing = mapRef.current.get(m.id)
        if (existing && existing.attachment_url !== cached.url) {
          mapRef.current.set(m.id, { ...existing, attachment_url: cached.url })
          bump()
        }
        return
      }

      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
      if (error || !data?.signedUrl) {
        // fail silently (bubble can show fallback)
        return
      }

      signedCacheRef.current.set(key, {
        url: data.signedUrl,
        expiresAt: now + SIGNED_URL_TTL_SECONDS * 1000,
      })

      const existing = mapRef.current.get(m.id)
      if (existing) {
        mapRef.current.set(m.id, { ...existing, attachment_url: data.signedUrl })
        bump()
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
            attachment_url: m.attachment_url ?? existing.attachment_url ?? null,
            attachment_preview_url: m.attachment_preview_url ?? existing.attachment_preview_url ?? null,
            client_status:
              existing.client_status === "pending"
                ? (m.client_status ?? "sent")
                : (m.client_status ?? existing.client_status),
          }

          if (
            next.read_at !== existing.read_at ||
            next.content !== existing.content ||
            next.client_status !== existing.client_status ||
            next.attachment_type !== existing.attachment_type ||
            next.attachment_bucket !== existing.attachment_bucket ||
            next.attachment_path !== existing.attachment_path ||
            next.attachment_url !== existing.attachment_url
          ) {
            mapRef.current.set(m.id, next)
            changed = true
          }
        }
      }

      if (changed) bump()

      // Kick off signing for any message that needs it (async, no blocking)
      for (const m of msgs) {
        if (m.attachment_bucket && m.attachment_path) {
          const current = mapRef.current.get(m.id)
          if (current && !current.attachment_url) {
            void ensureSignedUrl(current)
          }
        }
      }
    },
    [bump, ensureSignedUrl]
  )

  const loadInitial = useCallback(async () => {
    if (!requestId) return
    setLoadingInitial(true)

    const { data, error } = await supabase
      .from("messages")
      .select(
        [
          "id",
          "request_id",
          "sender_id",
          "content",
          "created_at",
          "read_at",
          "client_temp_id",
          // attachments:
          "attachment_type",
          "attachment_bucket",
          "attachment_path",
          "attachment_content_type",
          "attachment_size_bytes",
          "attachment_width",
          "attachment_height",
        ].join(", ")
      )
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

    mergeMessages((data ?? []).map((m: any) => ({ ...(m as UIMessage), client_status: "sent" })))
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
      .select(
        [
          "id",
          "request_id",
          "sender_id",
          "content",
          "created_at",
          "read_at",
          "client_temp_id",
          // attachments:
          "attachment_type",
          "attachment_bucket",
          "attachment_path",
          "attachment_content_type",
          "attachment_size_bytes",
          "attachment_width",
          "attachment_height",
        ].join(", ")
      )
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

    mergeMessages((data ?? []).map((m: any) => ({ ...(m as UIMessage), client_status: "sent" })))
    setHasMore((data ?? []).length === PAGE_SIZE)
    setOldestCursorFromCurrent()
    setLoadingMore(false)
  }, [hasMore, loadingMore, mergeMessages, requestId, setOldestCursorFromCurrent])

  // ---- Optimistic send (text only) ----
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
        const existing = mapRef.current.get(tId)
        if (existing) {
          mapRef.current.set(tId, { ...existing, client_status: "error" })
          bump()
        }
        return { ok: false, tempId: tId, errorMessage: error.message }
      }

      return { ok: true, tempId: tId }
    },
    [bump, requestId]
  )

  // ---- Optimistic send with image attachment ----
  const sendOptimisticWithImage = useCallback(
    async (
      senderId: string,
      content: string,
      file: File,
      opts?: { bucket?: string }
    ): Promise<{ ok: boolean; tempId?: string; errorMessage?: string }> => {
      const bucket = opts?.bucket ?? "message-attachments"
      const tId = tempId()
      const nowIso = new Date().toISOString()

      const previewUrl = URL.createObjectURL(file)
      const dims = await readImageDims(file)

      const ext = extFromType(file.type)
      const objectPath = `${requestId}/${tId}_${senderId}.${ext}`

      // optimistic bubble immediately
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
        attachment_path: objectPath,
        attachment_content_type: file.type || null,
        attachment_size_bytes: file.size || null,
        attachment_width: dims?.width ?? null,
        attachment_height: dims?.height ?? null,
        attachment_preview_url: previewUrl,
        attachment_url: previewUrl, // bubble can use this until signed url arrives
      })
      bump()

      // upload file first
      const uploadRes = await supabase.storage.from(bucket).upload(objectPath, file, {
        contentType: file.type,
        upsert: false,
      })

      if (uploadRes.error) {
        console.error("upload error:", uploadRes.error)
        const existing = mapRef.current.get(tId)
        if (existing) {
          mapRef.current.set(tId, { ...existing, client_status: "error" })
          bump()
        }
        return { ok: false, tempId: tId, errorMessage: uploadRes.error.message }
      }

      // insert message row with attachment metadata
      const { error: insErr } = await supabase.from("messages").insert({
        request_id: requestId,
        sender_id: senderId,
        content,
        client_temp_id: tId,

        attachment_type: "image",
        attachment_bucket: bucket,
        attachment_path: objectPath,
        attachment_content_type: file.type,
        attachment_size_bytes: file.size,
        attachment_width: dims?.width ?? null,
        attachment_height: dims?.height ?? null,
      })

      if (insErr) {
        console.error("sendOptimisticWithImage insert error:", insErr)

        // best-effort cleanup to prevent orphaned storage
        try {
          await supabase.storage.from(bucket).remove([objectPath])
        } catch {}

        const existing = mapRef.current.get(tId)
        if (existing) {
          mapRef.current.set(tId, { ...existing, client_status: "error" })
          bump()
        }
        return { ok: false, tempId: tId, errorMessage: insErr.message }
      }

      // Realtime INSERT will reconcile temp -> real id.
      // When it does, we also sign the URL.
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

      // If it's an image message, we can't reliably retry without the original File.
      // So: retry only for text messages.
      if (msg.attachment_type) {
        mapRef.current.set(tempMessageId, { ...msg, client_status: "error" })
        bump()
        return
      }

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

            // if temp had a blob preview, carry it over while we fetch signed url
            const next: UIMessage = {
              ...temp,
              ...row,
              client_status: "sent",
              attachment_preview_url: temp.attachment_preview_url ?? null,
              attachment_url: temp.attachment_preview_url ?? null, // temporary; will be replaced by signed url
            }

            mapRef.current.set(row.id, next)
            bump()
            setOldestCursorFromCurrent()

            // If attachment exists, sign it
            if (row.attachment_bucket && row.attachment_path) {
              void ensureSignedUrl(next)
            }
            return
          }

          mergeMessages([{ ...(row as UIMessage), client_status: "sent" }])
          setOldestCursorFromCurrent()
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          mergeMessages([{ ...(payload.new as Message), client_status: "sent" } as UIMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, loadInitial, mergeMessages, reset, bump, setOldestCursorFromCurrent, ensureSignedUrl])

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