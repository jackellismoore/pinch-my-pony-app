"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export type ThreadRow = {
  request_id: string
  horse_name: string
  other_display_name: string
  unread_count: number
  last_message: string | null
  last_message_at: string | null
}

export function useThreads() {
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("message_threads")
      .select("request_id, horse_name, other_display_name, unread_count, last_message, last_message_at")
      .order("last_message_at", { ascending: false })

    if (error) {
      console.error("threads load error:", error)
      setThreads([])
      setLoading(false)
      return
    }

    setThreads((data ?? []) as ThreadRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    // simple: any new message/update -> reload view
    const channel = supabase
      .channel("threads:refresh")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  return { threads, loading, reload: load }
}
