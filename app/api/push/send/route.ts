import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { createPrivateKey, sign as cryptoSign } from "crypto";
import { connect } from "http2";

export const runtime = "nodejs";

type Payload = {
  userId: string;
  title: string;
  body: string;
  url: string;
};

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createAppleJwt() {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyRaw = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKeyRaw) {
    throw new Error("Missing Apple push env vars");
  }

  const privateKeyPem = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  const header = {
    alg: "ES256",
    kid: keyId,
  };

  const claims = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaims = base64url(JSON.stringify(claims));
  const unsigned = `${encodedHeader}.${encodedClaims}`;

  const key = createPrivateKey(privateKeyPem);
  const signature = cryptoSign("sha256", Buffer.from(unsigned), {
    key,
    dsaEncoding: "ieee-p1363",
  });

  return `${unsigned}.${base64url(signature)}`;
}

function sendApnsNotification({
  token,
  title,
  body,
  url,
}: {
  token: string;
  title: string;
  body: string;
  url: string;
}) {
  return new Promise<void>((resolve, reject) => {
    const bundleId = process.env.APPLE_BUNDLE_ID;
    const useProduction = String(process.env.APPLE_USE_PRODUCTION ?? "true").toLowerCase() === "true";

    if (!bundleId) {
      reject(new Error("Missing APPLE_BUNDLE_ID"));
      return;
    }

    const jwt = createAppleJwt();
    const host = useProduction ? "api.push.apple.com" : "api.sandbox.push.apple.com";

    const client = connect(`https://${host}`);

    client.on("error", (err) => {
      client.close();
      reject(err);
    });

    const payload = JSON.stringify({
      aps: {
        alert: {
          title,
          body,
        },
        sound: "default",
        badge: 1,
      },
      url,
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });

    let responseBody = "";
    let statusCode = 0;

    req.setEncoding("utf8");

    req.on("response", (headers) => {
      const status = headers[":status"];
      statusCode = typeof status === "number" ? status : Number(status ?? 0);
    });

    req.on("data", (chunk) => {
      responseBody += chunk;
    });

    req.on("end", () => {
      client.close();

      if (statusCode >= 200 && statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`APNs failed (${statusCode}): ${responseBody || "Unknown error"}`));
      }
    });

    req.on("error", (err) => {
      client.close();
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

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

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error) {
      console.error("push_subscriptions select error:", error);
      return new Response("Failed to fetch subscriptions", { status: 500 });
    }

    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails("mailto:admin@pinchmypony.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    }

    const results = await Promise.allSettled(
      (subs ?? []).map(async (s) => {
        if (typeof s.endpoint === "string" && s.endpoint.startsWith("ios:")) {
          const token = s.endpoint.slice(4);
          if (!token) throw new Error("Empty iOS device token");

          await sendApnsNotification({
            token,
            title,
            body,
            url,
          });
          return;
        }

        if (!s.endpoint || !s.p256dh || !s.auth) {
          throw new Error("Incomplete web push subscription");
        }

        const payload = JSON.stringify({ title, body, url });

        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload
        );
      })
    );

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;

    return Response.json({ ok: true, sent: ok, failed: fail });
  } catch (e: any) {
    console.error("push send route error:", e);
    return new Response(e?.message ?? "Error", { status: 500 });
  }
}