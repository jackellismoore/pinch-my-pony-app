import { supabase } from "@/lib/supabaseClient"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export async function registerPushForCurrentUser() {
  if (typeof window === "undefined") return
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) {
    console.warn("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY")
    return
  }

  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) return

  const perm = await Notification.requestPermission()
  if (perm !== "granted") return

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })

  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const json = sub.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) return

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint,
    p256dh,
    auth,
  })

  // Duplicate insert is OK because table is unique(user_id, endpoint)
  if (error && !String(error.message).toLowerCase().includes("duplicate")) {
    console.warn("push_subscriptions insert error:", error)
  }
}
