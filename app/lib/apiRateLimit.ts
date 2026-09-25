import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type RateLimitResult = {
  allowed: boolean;
  retry_after_seconds: number;
};

export async function apiRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
) {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const admin = getSupabaseAdmin();

  const { data, error } = await admin.rpc("consume_api_rate_limit", {
    p_key: key,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] shared limiter failed:", error);
    throw new Error("Rate limit service unavailable");
  }

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitResult | null;

  if (!row) {
    throw new Error("Rate limit service returned no result");
  }

  return {
    ok: row.allowed,
    retryAfterSeconds: Math.max(0, Number(row.retry_after_seconds ?? 0)),
  } as const;
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return new Response("Too many requests. Please try again shortly.", {
    status: 429,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "retry-after": String(retryAfterSeconds),
      "cache-control": "no-store",
    },
  });
}

export function requestIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}
