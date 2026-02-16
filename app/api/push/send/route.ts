import webpush from "web-push"

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

    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      return new Response("Missing env vars", { status: 500 })
    }

    webpush.setVapidDetails("mailto:admin@pinchmypony.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}`, {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error("Supabase REST error:", txt)
      return new Response("Failed to fetch subscriptions", { status: 500 })
    }

    const subs = (await res.json()) as Array<{ endpoint: string; p256dh: string; auth: string }>
    const payload = JSON.stringify({ title, body, url })

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          )
        } catch (e) {
          // ignore dead endpoints
        }
      })
    )

    return Response.json({ ok: true, sent: subs.length })
  } catch (e: any) {
    return new Response(e?.message ?? "Error", { status: 500 })
  }
}
