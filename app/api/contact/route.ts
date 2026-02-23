import { Resend } from "resend";

export const runtime = "nodejs";

type Payload = {
  name: string;
  email: string;
  topic: string;
  message: string;
  userId?: string | null;

  // anti-abuse
  honeypot?: string;
  startedAt?: number;
};

function clean(s: any) {
  return String(s ?? "").trim();
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Basic in-memory rate limit (best-effort on serverless).
 * Keyed by IP. Sliding window.
 */
const RL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RL_MAX = 5;
const rl = new Map<string, number[]>();

function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function rateLimitOk(key: string) {
  const now = Date.now();
  const arr = rl.get(key) ?? [];
  const fresh = arr.filter((t) => now - t < RL_WINDOW_MS);
  if (fresh.length >= RL_MAX) {
    rl.set(key, fresh);
    return { ok: false, retryAfterMs: RL_WINDOW_MS - (now - fresh[0]) };
  }
  fresh.push(now);
  rl.set(key, fresh);
  return { ok: true, retryAfterMs: 0 };
}

export async function POST(req: Request) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL;
    const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL;

    if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
      return new Response("Missing env vars", { status: 500 });
    }

    const ip = getIp(req);
    const rlRes = rateLimitOk(ip);
    if (!rlRes.ok) {
      return new Response("Too many requests. Please try again shortly.", {
        status: 429,
        headers: {
          "retry-after": String(Math.ceil(rlRes.retryAfterMs / 1000)),
        },
      });
    }

    const body = (await req.json()) as Payload;

    // Honeypot
    const honeypot = clean(body.honeypot);
    if (honeypot) {
      // pretend ok (do not give signal to bots)
      return Response.json({ ok: true });
    }

    // Minimum submit time (basic bot friction)
    const startedAt = Number(body.startedAt ?? 0);
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      return new Response("Invalid request.", { status: 400 });
    }
    const elapsed = Date.now() - startedAt;
    if (elapsed < 1200) {
      return new Response("Please try again.", { status: 400 });
    }

    const name = clean(body.name);
    const email = clean(body.email);
    const topic = clean(body.topic || "General");
    const message = clean(body.message);
    const userId = clean(body.userId ?? "");

    if (!name) return new Response("Name is required.", { status: 400 });
    if (!email) return new Response("Email is required.", { status: 400 });
    if (!isValidEmail(email)) return new Response("Invalid email.", { status: 400 });
    if (!message) return new Response("Message is required.", { status: 400 });
    if (message.length < 20) return new Response("Message is too short.", { status: 400 });
    if (message.length > 2000) return new Response("Message is too long.", { status: 400 });

    const resend = new Resend(RESEND_API_KEY);

    const subject = `Pinch My Pony Support — ${topic}`;
    const safeUserLine = userId ? `User ID: ${userId}` : "User ID: (not signed in)";

    // Simple, premium-ish HTML email (no extra deps)
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #f7f7f7; padding: 24px;">
        <div style="max-width: 720px; margin: 0 auto; background: white; border: 1px solid rgba(15,23,42,0.12); border-radius: 16px; overflow: hidden;">
          <div style="padding: 16px 18px; background: linear-gradient(90deg, rgba(31,61,43,0.08), rgba(200,162,77,0.10), rgba(31,42,68,0.07));">
            <div style="font-weight: 900; color: #1F2A44; font-size: 16px;">Pinch My Pony — Contact Form</div>
            <div style="opacity: 0.75; margin-top: 4;">Topic: ${escapeHtml(topic)}</div>
          </div>

          <div style="padding: 18px;">
            <div style="display: grid; gap: 10px;">
              <div><span style="font-weight: 900; color:#1F2A44;">From:</span> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</div>
              <div style="opacity: 0.8;"><span style="font-weight: 900; color:#1F2A44;">${escapeHtml(safeUserLine)}</span></div>
              <div style="opacity: 0.8;"><span style="font-weight: 900; color:#1F2A44;">IP:</span> ${escapeHtml(ip)}</div>
            </div>

            <div style="height: 1px; background: rgba(15,23,42,0.10); margin: 14px 0;"></div>

            <div style="white-space: pre-wrap; line-height: 1.65; color: #0f172a;">${escapeHtml(message)}</div>
          </div>
        </div>

        <div style="max-width: 720px; margin: 10px auto 0; font-size: 12px; opacity: 0.7;">
          Sent from the Pinch My Pony Contact Us page.
        </div>
      </div>
    `;

    const sendRes = await resend.emails.send({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      subject,
      replyTo: email,
      html,
    });

    if ((sendRes as any)?.error) {
      console.error("Resend error:", (sendRes as any).error);
      return new Response("Failed to send email. Please try again.", { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    console.error("contact route error:", e);
    return new Response(e?.message ?? "Error", { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}