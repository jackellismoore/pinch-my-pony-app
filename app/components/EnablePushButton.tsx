"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function EnablePushButton() {
  const [ready, setReady] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setReady(typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window)
  }, [])

  const enable = async () => {
    // You must set this in env and expose it:
    // NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      alert("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY")
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) {
      alert("Login required")
      return
    }

    const reg = await navigator.serviceWorker.register("/sw.js")

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    const json = sub.toJSON()
    const endpoint = sub.endpoint
    const p256dh = json.keys?.p256dh || ""
    const auth = json.keys?.auth || ""

    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id: authData.user.id,
      endpoint,
      p256dh,
      auth,
    })

    if (error) {
      console.error(error)
      alert("Failed to save subscription")
      return
    }

    setEnabled(true)
  }

  if (!ready) return null

  return (
    <button
      onClick={enable}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(15,23,42,0.12)",
        background: enabled ? "rgba(34,197,94,0.12)" : "white",
        cursor: "pointer",
        fontWeight: 900,
      }}
    >
      {enabled ? "Push Enabled" : "Enable Push Notifications"}
    </button>
  )
}
