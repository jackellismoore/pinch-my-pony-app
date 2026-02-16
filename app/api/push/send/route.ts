import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

type Payload = {
  userId: string
  title: string
  body: string
  url: string
}

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = (await req.json()) as Payload

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

    if (!SUPABASE_URL || !SERVICE_ROLE || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response("Missing env vars", { status: 500 })
    }

    // Server-only Supabase client (service role)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)

    if (error) {
      console.error("push_subscriptions select error:", error)
      return new Response("Failed to fetch subscriptions", { status: 500 })
    }

    webpush.setVapidDetails("mailto:admin@pinchmypony.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const payload = JSON.stringify({ title, body, url })

    // Send to all subscriptions (ignore individual failures)
    const results = await Promise.allSettled(
      (subs ?? []).map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    )

    const ok = results.filter((r) => r.status === "fulfilled").length
    const fail = results.length - ok

    return Response.json({ ok: true, sent: ok, failed: fail })
  } catch (e: any) {
    console.error("push send route error:", e)
    return new Response(e?.message ?? "Error", { status: 500 })
  }
}
