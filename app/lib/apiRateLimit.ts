type Bucket = { startedAt: number; count: number };

const buckets = new Map<string, Bucket>();

export function apiRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    return { ok: true as const, retryAfterSeconds: 0 };
  }

  if (current.count >= maxRequests) {
    return {
      ok: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true as const, retryAfterSeconds: 0 };
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
