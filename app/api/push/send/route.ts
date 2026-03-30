import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { createPrivateKey, sign as cryptoSign } from "crypto";
import { connect } from "http2";

export const runtime = "nodejs";

type EventType =
  | "message"
  | "borrow_request_created"
  | "borrow_request_status_changed"
  | "booking_starts_tomorrow"
  | "booking_starts_today"
  | "booking_ends_tomorrow"
  | "pending_request_owner_reminder"
  | "pending_request_owner_reminder_48h"
  | "review_left_for_owner"
  | "review_reminder_borrower"
  | "review_reminder_borrower_48h";

type RecipientRole = "owner" | "borrower";

type Payload = {
  userId: string;
  url: string;

  title?: string;
  body?: string;

  senderId?: string;
  requestId?: string;
  messageText?: string;

  eventType?: EventType;
  status?: "pending" | "approved" | "rejected";

  recipientRole?: RecipientRole;
};

type PushRow = {
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
};

type ProfileMini = {
  id?: string;
  display_name: string | null;
  full_name: string | null;
};

type BorrowRequestForMessage = {
  id: string;
  horse_id: string | null;
  horses: {
    name: string | null;
  } | null;
};

type BorrowRequestExpanded = {
  id: string;
  horse_id: string | null;
  borrower_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  created_at?: string | null;
  horses: {
    id?: string | null;
    name: string | null;
    owner_id?: string | null;
  } | null;
};

type ReviewMini = {
  id: string;
  request_id?: string | null;
  borrower_id: string | null;
  owner_id: string | null;
  horse_id: string | null;
  rating: number | null;
  comment: string | null;
  created_at?: string | null;
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

function cleanPreview(input: string) {
  const collapsed = input.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 140) return collapsed;
  return `${collapsed.slice(0, 137).trim()}...`;
}

function displayName(profile: ProfileMini | null | undefined) {
  const dn = profile?.display_name?.trim();
  if (dn) return dn;
  const fn = profile?.full_name?.trim();
  if (fn) return fn;
  return "Someone";
}

function formatDateShort(input: string | null | undefined) {
  if (!input) return "Unknown date";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input).slice(0, 10);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

async function getProfile(
  admin: SupabaseClient,
  userId: string | null | undefined
): Promise<ProfileMini | null> {
  if (!userId) return null;

  const { data } = await admin
    .from("profiles")
    .select("id, display_name, full_name")
    .eq("id", userId)
    .maybeSingle<ProfileMini>();

  return data ?? null;
}

async function getBorrowRequestExpanded(
  admin: SupabaseClient,
  requestId: string
): Promise<BorrowRequestExpanded | null> {
  const { data } = await admin
    .from("borrow_requests")
    .select("id, horse_id, borrower_id, start_date, end_date, status, created_at, horses(id, name, owner_id)")
    .eq("id", requestId)
    .maybeSingle<BorrowRequestExpanded>();

  return data ?? null;
}

async function getLatestReviewForRequest(
  admin: SupabaseClient,
  requestId: string
): Promise<ReviewMini | null> {
  const { data } = await admin
    .from("reviews")
    .select("id, request_id, borrower_id, owner_id, horse_id, rating, comment, created_at")
    .eq("request_id", requestId)
    .order("id", { ascending: false })
    .limit(1);

  const rows = (data ?? []) as ReviewMini[];
  return rows[0] ?? null;
}

async function buildNotificationCopy(
  admin: SupabaseClient,
  payload: Payload
): Promise<{ title: string; body: string }> {
  if (
    (payload.eventType === "message" ||
      (!payload.eventType &&
        payload.senderId &&
        payload.requestId &&
        payload.messageText)) &&
    payload.senderId &&
    payload.requestId &&
    payload.messageText
  ) {
    const [{ data: sender }, { data: request }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, display_name, full_name")
        .eq("id", payload.senderId)
        .maybeSingle<ProfileMini>(),
      admin
        .from("borrow_requests")
        .select("id, horse_id, horses(name)")
        .eq("id", payload.requestId)
        .maybeSingle<BorrowRequestForMessage>(),
    ]);

    const senderName = displayName(sender ?? null);
    const horseName = request?.horses?.name?.trim() || "your horse";

    return {
      title: `${senderName} · ${horseName}`,
      body: cleanPreview(payload.messageText),
    };
  }

  if (payload.eventType === "borrow_request_created" && payload.requestId) {
    const request = await getBorrowRequestExpanded(admin, payload.requestId);

    const borrower = await getProfile(admin, request?.borrower_id);
    const borrowerName = displayName(borrower ?? null);
    const horseName = request?.horses?.name?.trim() || "your horse";
    const start = formatDateShort(request?.start_date);
    const end = formatDateShort(request?.end_date);

    return {
      title: `New borrow request · ${horseName}`,
      body: `${borrowerName} requested ${start} to ${end}`,
    };
  }

  if (payload.eventType === "borrow_request_status_changed" && payload.requestId) {
    const request = await getBorrowRequestExpanded(admin, payload.requestId);
    const horseName = request?.horses?.name?.trim() || "your horse";
    const status = (payload.status || request?.status || "pending").toLowerCase();

    if (status === "approved") {
      return {
        title: `Borrow request accepted · ${horseName}`,
        body: "Your request was approved.",
      };
    }

    if (status === "rejected") {
      return {
        title: `Borrow request declined · ${horseName}`,
        body: "Your request was declined.",
      };
    }

    return {
      title: `Borrow request updated · ${horseName}`,
      body: `Status: ${status}`,
    };
  }

  if (
    (payload.eventType === "booking_starts_tomorrow" ||
      payload.eventType === "booking_starts_today" ||
      payload.eventType === "booking_ends_tomorrow" ||
      payload.eventType === "pending_request_owner_reminder" ||
      payload.eventType === "pending_request_owner_reminder_48h" ||
      payload.eventType === "review_reminder_borrower" ||
      payload.eventType === "review_reminder_borrower_48h") &&
    payload.requestId
  ) {
    const request = await getBorrowRequestExpanded(admin, payload.requestId);

    const borrower = await getProfile(admin, request?.borrower_id);
    const borrowerName = displayName(borrower ?? null);

    const horseName = request?.horses?.name?.trim() || "your horse";
    const start = formatDateShort(request?.start_date);
    const end = formatDateShort(request?.end_date);
    const role = payload.recipientRole || "borrower";

    if (payload.eventType === "booking_starts_tomorrow") {
      if (role === "owner") {
        return {
          title: `Booking starts tomorrow · ${horseName}`,
          body: `${borrowerName}'s approved booking starts tomorrow (${start} to ${end}).`,
        };
      }

      return {
        title: `Ride starts tomorrow · ${horseName}`,
        body: `Your approved booking starts tomorrow (${start} to ${end}).`,
      };
    }

    if (payload.eventType === "booking_starts_today") {
      if (role === "owner") {
        return {
          title: `Booking starts today · ${horseName}`,
          body: `${borrowerName}'s approved booking starts today (${start} to ${end}).`,
        };
      }

      return {
        title: `Ride starts today · ${horseName}`,
        body: `Your approved booking starts today.`,
      };
    }

    if (payload.eventType === "booking_ends_tomorrow") {
      if (role === "owner") {
        return {
          title: `Booking ends tomorrow · ${horseName}`,
          body: `${borrowerName}'s booking ends tomorrow.`,
        };
      }

      return {
        title: `Ride ends tomorrow · ${horseName}`,
        body: `Your approved booking for ${horseName} ends tomorrow.`,
      };
    }

    if (payload.eventType === "pending_request_owner_reminder") {
      return {
        title: `Pending borrow request · ${horseName}`,
        body: `${borrowerName} is still waiting for your decision (${start} to ${end}).`,
      };
    }

    if (payload.eventType === "pending_request_owner_reminder_48h") {
      return {
        title: `Still pending · ${horseName}`,
        body: `${borrowerName} is still waiting for your decision after 48 hours.`,
      };
    }

    if (payload.eventType === "review_reminder_borrower") {
      return {
        title: `How was ${horseName}?`,
        body: "Your booking has ended — leave a quick review.",
      };
    }

    if (payload.eventType === "review_reminder_borrower_48h") {
      return {
        title: `Still want to review ${horseName}?`,
        body: "You can still leave a quick review for your completed booking.",
      };
    }
  }

  if (payload.eventType === "review_left_for_owner" && payload.requestId) {
    const [request, review] = await Promise.all([
      getBorrowRequestExpanded(admin, payload.requestId),
      getLatestReviewForRequest(admin, payload.requestId),
    ]);

    const horseName = request?.horses?.name?.trim() || "your horse";
    const borrower = await getProfile(admin, review?.borrower_id || request?.borrower_id);
    const borrowerName = displayName(borrower ?? null);
    const rating = Number(review?.rating ?? 0);

    if (review?.comment?.trim()) {
      return {
        title: `New review · ${horseName}`,
        body: `${borrowerName}: ${cleanPreview(review.comment.trim())}`,
      };
    }

    return {
      title: `New review · ${horseName}`,
      body: `${borrowerName} left a ${rating || 5}/5 review.`,
    };
  }

  return {
    title: payload.title?.trim() || "New notification",
    body: payload.body?.trim() || "You have a new update.",
  };
}

async function sendApnsNotification({
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
  const bundleId = process.env.APPLE_BUNDLE_ID;
  const useProduction =
    String(process.env.APPLE_USE_PRODUCTION ?? "true").toLowerCase() === "true";

  if (!bundleId) {
    throw new Error("Missing APPLE_BUNDLE_ID");
  }

  const jwt = createAppleJwt();
  const host = useProduction ? "api.push.apple.com" : "api.sandbox.push.apple.com";

  return new Promise<void>((resolve, reject) => {
    const client = connect(`https://${host}`);

    client.on("error", (err) => {
      client.close();
      reject(err);
    });

    const pushPayload = JSON.stringify({
      aps: {
        alert: {
          title,
          body,
        },
        sound: "default",
        badge: 1,
      },
      url,
      title,
      body,
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
        return;
      }

      reject(
        new Error(
          `APNs failed (${statusCode}) host=${host} bundleId=${bundleId} body=${responseBody || "Unknown error"}`
        )
      );
    });

    req.on("error", (err) => {
      client.close();
      reject(err);
    });

    req.write(pushPayload);
    req.end();
  });
}

function shouldDeleteSubscription(endpoint: string, message: string) {
  if (!endpoint) return false;

  const normalized = String(message || "");

  if (!endpoint.startsWith("ios:")) {
    return (
      normalized.includes("410") ||
      normalized.includes("Expiration") ||
      normalized.includes("expired") ||
      normalized.includes("unsubscribed")
    );
  }

  return (
    normalized.includes("BadDeviceToken") ||
    normalized.includes("Unregistered") ||
    normalized.includes("DeviceTokenNotForTopic") ||
    normalized.includes("410")
  );
}

async function deleteBadSubscription(admin: SupabaseClient, endpoint: string) {
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.warn("[push] failed deleting bad subscription:", endpoint, error);
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Payload;

    if (!payload.userId || !payload.url) {
      return new Response("Missing required fields", { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response("Missing Supabase env vars", { status: 500 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const copy = await buildNotificationCopy(admin, payload);

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", payload.userId);

    if (error) {
      console.error("[push] push_subscriptions select error:", error);
      return new Response("Failed to fetch subscriptions", { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return Response.json({
        ok: true,
        sent: 0,
        failed: 0,
        title: copy.title,
        body: copy.body,
        details: [],
      });
    }

    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        "mailto:admin@pinchmypony.com",
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      );
    }

    const details = await Promise.all(
      (subs as PushRow[]).map(async (s) => {
        try {
          if (typeof s.endpoint === "string" && s.endpoint.startsWith("ios:")) {
            const token = s.endpoint.slice(4).trim();
            if (!token) throw new Error("Empty iOS device token");

            await sendApnsNotification({
              token,
              title: copy.title,
              body: copy.body,
              url: payload.url,
            });

            return {
              endpoint: `${s.endpoint.slice(0, 28)}...`,
              type: "ios",
              ok: true,
            };
          }

          if (!s.endpoint || !s.p256dh || !s.auth) {
            throw new Error("Incomplete web push subscription");
          }

          const webPayload = JSON.stringify({
            title: copy.title,
            body: copy.body,
            url: payload.url,
          });

          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            webPayload
          );

          return {
            endpoint: `${s.endpoint.slice(0, 60)}...`,
            type: "web",
            ok: true,
          };
        } catch (error: any) {
          const message = error?.message ?? "Unknown push error";

          console.error("[push] delivery failed:", {
            endpoint: s.endpoint,
            message,
          });

          if (shouldDeleteSubscription(s.endpoint, message)) {
            await deleteBadSubscription(admin, s.endpoint);
          }

          return {
            endpoint: `${s.endpoint.slice(0, 60)}...`,
            type: s.endpoint.startsWith("ios:") ? "ios" : "web",
            ok: false,
            error: message,
          };
        }
      })
    );

    const sent = details.filter((d) => d.ok).length;
    const failed = details.length - sent;

    return Response.json({
      ok: true,
      sent,
      failed,
      title: copy.title,
      body: copy.body,
      details,
    });
  } catch (e: any) {
    console.error("[push] send route error:", e);
    return new Response(e?.message ?? "Error", { status: 500 });
  }
}