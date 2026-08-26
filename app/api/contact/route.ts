import { Resend } from "resend";
import { brandedEmail, escapeEmailHtml } from "@/lib/emailTemplate";

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

    const detailRows = [
      ["From", `${name} <${email}>`],
      ["Topic", topic],
      ["Account", safeUserLine],
      ["IP", ip],
    ]
      .map(
        ([label, value]) =>
          `<tr><td style="padding:9px 14px 9px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#17213A;vertical-align:top">${escapeEmailHtml(label)}</td><td style="padding:9px 0;font-family:Arial,sans-serif;font-size:13px;line-height:20px;color:#596173">${escapeEmailHtml(value)}</td></tr>`
      )
      .join("");

    const html = brandedEmail({
      preheader: `New ${topic} support message from ${name}`,
      eyebrow: "Support request",
      title: `New ${topic} enquiry`,
      intro: "A member has contacted Pinch My Pony support.",
      contentHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;border-top:1px solid #E7E3DA;border-bottom:1px solid #E7E3DA">${detailRows}</table>
        <div style="margin-top:24px;padding:18px;border-radius:14px;background:#F7F6F2;font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#2D3548;white-space:pre-wrap">${escapeEmailHtml(message)}</div>`,
      action: { label: "Reply to member", href: `mailto:${email}` },
      footerNote: "Submitted through the Pinch My Pony support form.",
    });

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

    const acknowledgement = await resend.emails.send({
      from: CONTACT_FROM_EMAIL,
      to: email,
      subject: "We’ve received your Pinch My Pony message",
      replyTo: CONTACT_TO_EMAIL,
      html: brandedEmail({
        preheader: "Your Pinch My Pony support request is safely with us.",
        eyebrow: "Message received",
        title: `Thanks, ${name}`,
        intro:
          "Your message is safely with the Pinch My Pony support team. We’ll reply to the email address you provided as soon as we can.",
        contentHtml: `<div style="margin-top:24px;padding:16px 18px;border-radius:14px;background:#F3F7F4;border:1px solid #D9E5DC;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#3E4B43"><strong style="color:#1F4B36">Topic:</strong> ${escapeEmailHtml(topic)}<br><span style="color:#687168">For urgent safety concerns, do not rely on email alone—contact the appropriate emergency or professional service.</span></div>`,
        action: { label: "Return to Pinch My Pony", href: "https://pinchmypony.com" },
        footerNote: "Keep this email for your records. Reply here if you need to add anything.",
      }),
    });

    if ((acknowledgement as any)?.error) {
      // The support request has already arrived, so do not make the user submit again.
      console.error("Resend acknowledgement error:", (acknowledgement as any).error);
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    console.error("contact route error:", e);
    return new Response(e?.message ?? "Error", { status: 500 });
  }
}
