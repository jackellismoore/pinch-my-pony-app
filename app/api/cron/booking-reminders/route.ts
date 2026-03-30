import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReminderEventType =
  | "booking_starts_tomorrow"
  | "booking_starts_today"
  | "booking_ends_tomorrow"
  | "pending_request_owner_reminder"
  | "pending_request_owner_reminder_48h"
  | "review_reminder_borrower"
  | "review_reminder_borrower_48h";

type ReminderRole = "owner" | "borrower";

type ReminderCandidate = {
  id: string;
  borrower_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  horses: {
    name: string | null;
    owner_id?: string | null;
  } | null;
};

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBaseUrl() {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL;

  if (explicit) return explicit.replace(/\/+$/, "");

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  throw new Error(
    "Missing app base URL env (NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL)"
  );
}

function addDaysUtc(date: Date, days: number) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toYmdUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createdMoreThanHoursAgo(
  iso: string | null | undefined,
  hours: number
) {
  if (!iso) return false;
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created >= hours * 60 * 60 * 1000;
}

async function reserveReminderLog(
  admin: SupabaseClient,
  params: {
    userId: string;
    requestId: string;
    eventType: ReminderEventType;
    scheduledFor: string;
  }
) {
  const { error } = await admin.from("push_notification_logs").insert({
    user_id: params.userId,
    request_id: params.requestId,
    event_type: params.eventType,
    scheduled_for: params.scheduledFor,
  });

  if (!error) return true;

  const msg = String(error.message || "");
  const code = String((error as any)?.code || "");

  if (
    code === "23505" ||
    msg.toLowerCase().includes("duplicate") ||
    msg.toLowerCase().includes("unique")
  ) {
    return false;
  }

  throw error;
}

async function sendReminder({
  baseUrl,
  userId,
  url,
  requestId,
  eventType,
  recipientRole,
  cronSecret,
}: {
  baseUrl: string;
  userId: string;
  url: string;
  requestId: string;
  eventType: ReminderEventType;
  recipientRole: ReminderRole;
  cronSecret: string;
}) {
  const res = await fetch(`${baseUrl}/api/push/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({
      userId,
      url,
      requestId,
      eventType,
      recipientRole,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Push send failed (${res.status}): ${text}`);
  }

  return res.json().catch(() => null);
}

function resolveUrl(
  value: string | ((row: ReminderCandidate) => string) | undefined,
  row: ReminderCandidate,
  fallback: string
) {
  if (!value) return fallback;
  return typeof value === "function" ? value(row) : value;
}

async function processCandidates(
  admin: SupabaseClient,
  baseUrl: string,
  cronSecret: string,
  candidates: ReminderCandidate[],
  options: {
    eventType: ReminderEventType;
    scheduledFor: string;
    includeBorrower?: boolean;
    includeOwner?: boolean;
    borrowerUrl?: string | ((row: ReminderCandidate) => string);
    ownerUrl?: string | ((row: ReminderCandidate) => string);
    onlyIfCreatedMoreThanHoursAgo?: number;
  }
) {
  let sent = 0;
  let skipped = 0;

  for (const row of candidates) {
    if (!row.id) {
      skipped += 1;
      continue;
    }

    if (
      options.onlyIfCreatedMoreThanHoursAgo &&
      !createdMoreThanHoursAgo(
        row.created_at,
        options.onlyIfCreatedMoreThanHoursAgo
      )
    ) {
      skipped += 1;
      continue;
    }

    if (options.includeBorrower && row.borrower_id) {
      const reserved = await reserveReminderLog(admin, {
        userId: row.borrower_id,
        requestId: row.id,
        eventType: options.eventType,
        scheduledFor: options.scheduledFor,
      });

      if (reserved) {
        await sendReminder({
          baseUrl,
          cronSecret,
          userId: row.borrower_id,
          url: resolveUrl(options.borrowerUrl, row, "/dashboard/borrower"),
          requestId: row.id,
          eventType: options.eventType,
          recipientRole: "borrower",
        });
        sent += 1;
      } else {
        skipped += 1;
      }
    }

    const ownerId = row.horses?.owner_id ?? null;

    if (options.includeOwner && ownerId) {
      const reserved = await reserveReminderLog(admin, {
        userId: ownerId,
        requestId: row.id,
        eventType: options.eventType,
        scheduledFor: options.scheduledFor,
      });

      if (reserved) {
        await sendReminder({
          baseUrl,
          cronSecret,
          userId: ownerId,
          url: resolveUrl(options.ownerUrl, row, "/dashboard/owner/requests"),
          requestId: row.id,
          eventType: options.eventType,
          recipientRole: "owner",
        });
        sent += 1;
      } else {
        skipped += 1;
      }
    }
  }

  return { sent, skipped };
}

async function getApprovedStartingOn(
  admin: SupabaseClient,
  date: string
): Promise<ReminderCandidate[]> {
  const { data, error } = await admin
    .from("borrow_requests")
    .select(`
      id,
      borrower_id,
      start_date,
      end_date,
      created_at,
      horses(name, owner_id)
    `)
    .eq("status", "approved")
    .eq("start_date", date);

  if (error) throw error;
  return (data ?? []) as unknown as ReminderCandidate[];
}

async function getApprovedEndingOn(
  admin: SupabaseClient,
  date: string
): Promise<ReminderCandidate[]> {
  const { data, error } = await admin
    .from("borrow_requests")
    .select(`
      id,
      borrower_id,
      start_date,
      end_date,
      created_at,
      horses(name, owner_id)
    `)
    .eq("status", "approved")
    .eq("end_date", date);

  if (error) throw error;
  return (data ?? []) as unknown as ReminderCandidate[];
}

async function getPendingRequests(
  admin: SupabaseClient
): Promise<ReminderCandidate[]> {
  const { data, error } = await admin
    .from("borrow_requests")
    .select(`
      id,
      borrower_id,
      start_date,
      end_date,
      created_at,
      horses(name, owner_id)
    `)
    .eq("status", "pending");

  if (error) throw error;
  return (data ?? []) as unknown as ReminderCandidate[];
}

async function getEndedWithoutReview(
  admin: SupabaseClient,
  endDate: string
): Promise<ReminderCandidate[]> {
  const { data, error } = await admin
    .from("borrow_requests")
    .select(`
      id,
      borrower_id,
      start_date,
      end_date,
      created_at,
      horses(name, owner_id)
    `)
    .eq("status", "approved")
    .eq("end_date", endDate);

  if (error) throw error;

  const rows = (data ?? []) as unknown as ReminderCandidate[];
  if (rows.length === 0) return [];

  const requestIds = rows.map((r) => r.id);

  const { data: reviewRows, error: reviewErr } = await admin
    .from("reviews")
    .select("request_id")
    .in("request_id", requestIds);

  if (reviewErr) throw reviewErr;

  const reviewed = new Set(
    ((reviewRows ?? []) as Array<{ request_id: string | null }>)
      .map((r) => r.request_id)
      .filter(Boolean) as string[]
  );

  return rows.filter((row) => !reviewed.has(row.id));
}

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return new Response("Missing CRON_SECRET", { status: 500 });
    }

    const authHeader = req.headers.get("authorization");
    const xCronSecret = req.headers.get("x-cron-secret");
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret");

    const authorized =
      authHeader === `Bearer ${cronSecret}` ||
      xCronSecret === cronSecret ||
      querySecret === cronSecret;

    if (!authorized) {
      return new Response("Unauthorized", { status: 401 });
    }

    const admin = getAdmin();
    const baseUrl = getBaseUrl();

    const today = toYmdUtc(new Date());
    const tomorrow = toYmdUtc(addDaysUtc(new Date(), 1));
    const yesterday = toYmdUtc(addDaysUtc(new Date(), -1));
    const twoDaysAgo = toYmdUtc(addDaysUtc(new Date(), -2));

    const [
      startsTomorrowRows,
      startsTodayRows,
      endsTomorrowRows,
      pendingRows24,
      pendingRows48,
      reviewReminderRows24,
      reviewReminderRows48,
    ] = await Promise.all([
      getApprovedStartingOn(admin, tomorrow),
      getApprovedStartingOn(admin, today),
      getApprovedEndingOn(admin, tomorrow),
      getPendingRequests(admin),
      getPendingRequests(admin),
      getEndedWithoutReview(admin, yesterday),
      getEndedWithoutReview(admin, twoDaysAgo),
    ]);

    const startsTomorrow = await processCandidates(
      admin,
      baseUrl,
      cronSecret,
      startsTomorrowRows,
      {
        eventType: "booking_starts_tomorrow",
        scheduledFor: tomorrow,
        includeBorrower: true,
        includeOwner: true,
        borrowerUrl: "/dashboard/borrower",
        ownerUrl: "/dashboard/owner/requests",
      }
    );

    const startsToday = await processCandidates(
      admin,
      baseUrl,
      cronSecret,
      startsTodayRows,
      {
        eventType: "booking_starts_today",
        scheduledFor: today,
        includeBorrower: true,
        includeOwner: true,
        borrowerUrl: "/dashboard/borrower",
        ownerUrl: "/dashboard/owner/requests",
      }
    );

    const endsTomorrow = await processCandidates(
      admin,
      baseUrl,
      cronSecret,
      endsTomorrowRows,
      {
        eventType: "booking_ends_tomorrow",
        scheduledFor: tomorrow,
        includeBorrower: true,
        includeOwner: true,
        borrowerUrl: "/dashboard/borrower",
        ownerUrl: "/dashboard/owner/requests",
      }
    );

    const pendingOwnerReminders24 = await processCandidates(
      admin,
      baseUrl,
      cronSecret,
      pendingRows24,
      {
        eventType: "pending_request_owner_reminder",
        scheduledFor: today,
        includeOwner: true,
        includeBorrower: false,
        ownerUrl: "/dashboard/owner/requests",
        onlyIfCreatedMoreThanHoursAgo: 24,
      }
    );

    const pendingOwnerReminders48 = await processCandidates(
      admin,
      baseUrl,
      cronSecret,
      pendingRows48,
      {
        eventType: "pending_request_owner_reminder_48h",
        scheduledFor: today,
        includeOwner: true,
        includeBorrower: false,
        ownerUrl: "/dashboard/owner/requests",
        onlyIfCreatedMoreThanHoursAgo: 48,
      }
    );

    const reviewReminders24 = await processCandidates(
      admin,
      baseUrl,
      cronSecret,
      reviewReminderRows24,
      {
        eventType: "review_reminder_borrower",
        scheduledFor: today,
        includeBorrower: true,
        includeOwner: false,
        borrowerUrl: (row) => `/review/${row.id}`,
      }
    );

    const reviewReminders48 = await processCandidates(
      admin,
      baseUrl,
      cronSecret,
      reviewReminderRows48,
      {
        eventType: "review_reminder_borrower_48h",
        scheduledFor: today,
        includeBorrower: true,
        includeOwner: false,
        borrowerUrl: (row) => `/review/${row.id}`,
      }
    );

    return Response.json({
      ok: true,
      today,
      tomorrow,
      yesterday,
      twoDaysAgo,
      results: {
        booking_starts_tomorrow: startsTomorrow,
        booking_starts_today: startsToday,
        booking_ends_tomorrow: endsTomorrow,
        pending_request_owner_reminder: pendingOwnerReminders24,
        pending_request_owner_reminder_48h: pendingOwnerReminders48,
        review_reminder_borrower: reviewReminders24,
        review_reminder_borrower_48h: reviewReminders48,
      },
    });
  } catch (e: any) {
    console.error("[cron] booking reminders error:", e);
    return new Response(e?.message ?? "Error", { status: 500 });
  }
}