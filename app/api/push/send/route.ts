import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import apn from "@parse/node-apn";

export const runtime = "nodejs";

type Payload = {
  userId: string;
  title: string;
  body: string;
  url: string;
};

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = (await req.json()) as Payload;

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response("Missing Supabase env vars", { status: 500 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let webSent = 0;
    let webFailed = 0;
    let nativeSent = 0;
    let nativeFailed = 0;

    // ----------------------------
    // Web push (existing browser/PWA path)
    // ----------------------------
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      const { data: webSubs, error: webErr } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);

      if (!webErr && webSubs?.length) {
        webpush.setVapidDetails(
          "mailto:admin@pinchmypony.com",
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY
        );

        const payload = JSON.stringify({ title, body, url });

        const results = await Promise.allSettled(
          webSubs.map((s) =>
            webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload
            )
          )
        );

        webSent = results.filter((r) => r.status === "fulfilled").length;
        webFailed = results.length - webSent;
      }
    }

    // ----------------------------
    // Native iOS APNs push
    // ----------------------------
    const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
    const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
    const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY;
    const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID;
    const APPLE_USE_PRODUCTION =
      String(process.env.APPLE_USE_PRODUCTION ?? "true").toLowerCase() === "true";

    if (APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY && APPLE_BUNDLE_ID) {
      const { data: nativeDevices, error: nativeErr } = await admin
        .from("native_push_devices")
        .select("token, platform")
        .eq("user_id", userId);

      if (!nativeErr && nativeDevices?.length) {
        const provider = new apn.Provider({
          token: {
            key: APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            keyId: APPLE_KEY_ID,
            teamId: APPLE_TEAM_ID,
          },
          production: APPLE_USE_PRODUCTION,
        });

        const iosTargets = nativeDevices
          .filter((d) => d.token && (d.platform === "ios" || d.platform === "native"))
          .map((d) => d.token);

        if (iosTargets.length) {
          const note = new apn.Notification();
          note.topic = APPLE_BUNDLE_ID;
          note.alert = {
            title,
            body,
          };
          note.sound = "default";
          note.badge = 1;
          note.payload = {
            url,
            path: url,
          };

          const result = await provider.send(note, iosTargets);

          nativeSent = result.sent.length;
          nativeFailed = result.failed.length;

          // Cleanup invalid tokens
          const badTokens = result.failed
            .map((f: any) => f?.device)
            .filter(Boolean);

          if (badTokens.length) {
            await admin.from("native_push_devices").delete().in("token", badTokens);
          }
        }

        provider.shutdown();
      }
    }

    return Response.json({
      ok: true,
      webSent,
      webFailed,
      nativeSent,
      nativeFailed,
    });
  } catch (e: any) {
    console.error("push send route error:", e);
    return new Response(e?.message ?? "Error", { status: 500 });
  }
}