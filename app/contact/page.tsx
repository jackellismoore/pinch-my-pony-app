 "use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

type Topic = "General" | "Account & Verification" | "Borrowing" | "Owners" | "Payments" | "Safety";

const TOPICS: Topic[] = ["General", "Account & Verification", "Borrowing", "Owners", "Payments", "Safety"];

function isValidEmail(v: string) {
  const s = v.trim();
  // solid-enough UI validation; server also validates
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function ContactPage() {
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Topic>("General");
  const [message, setMessage] = useState("");

  // anti-abuse fields (client-side)
  const [honeypot, setHoneypot] = useState("");
  const [startedAt] = useState(() => Date.now());

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { ok: true } | { ok: false; error: string }>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      if (!cancelled) setUserId(u?.id ?? null);

      // Convenience: if signed in, prefill email if blank
      if (!cancelled && u?.email && !email) setEmail(u.email);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedMessage = message.trim();

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!trimmedName) e.name = "Please enter your name.";
    if (!trimmedEmail) e.email = "Please enter your email.";
    else if (!isValidEmail(trimmedEmail)) e.email = "Please enter a valid email address.";
    if (!trimmedMessage) e.message = "Please enter a message.";
    else if (trimmedMessage.length < 20) e.message = "Please add a little more detail (at least 20 characters).";
    else if (trimmedMessage.length > 2000) e.message = "Message is too long (max 2000 characters).";
    return e;
  }, [trimmedName, trimmedEmail, trimmedMessage]);

  const canSubmit = Object.keys(errors).length === 0 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setDone(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          topic,
          message: trimmedMessage,
          userId,
          // anti-abuse
          honeypot,
          startedAt,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const msg = text || "Something went wrong. Please try again.";
        setDone({ ok: false, error: msg });
        setSubmitting(false);
        return;
      }

      setDone({ ok: true });
      setSubmitting(false);
    } catch (err: any) {
      setDone({
        ok: false,
        error: err?.message ?? "Network error. Please try again.",
      });
      setSubmitting(false);
    }
  }

  return (
    <div style={pageWrap}>
      <style>{css}</style>

      <div style={container}>
        <header style={header}>
          <div style={eyebrowPill}>
            <span aria-hidden="true">📨</span>
            <span>Support</span>
          </div>
          <h1 style={title}>Contact Us</h1>
          <p style={subtitle}>
            Send us a note and we’ll get back to you. For urgent safety issues, include as much detail as you comfortably can.
          </p>
        </header>

        <div style={grid}>
          <section className="pmp-hoverLift" style={card}>
            {done?.ok ? (
              <SuccessPanel />
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>Message support</div>
                  {userId ? <span style={miniPill}>Signed in</span> : <span style={miniPillMuted}>Public</span>}
                </div>

                <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 10 }}>
                  {/* Honeypot (hidden) */}
                  <div style={honeypotWrap} aria-hidden="true">
                    <label style={{ fontWeight: 800, fontSize: 12, opacity: 0.7 }}>Leave this blank</label>
                    <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} style={input} tabIndex={-1} autoComplete="off" />
                  </div>

                  <Field label="Name" hint="So we know what to call you." error={errors.name}>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      style={inputError(!!errors.name)}
                      autoComplete="name"
                    />
                  </Field>

                  <Field label="Email" hint="We’ll reply here." error={errors.email}>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={inputError(!!errors.email)}
                      inputMode="email"
                      autoComplete="email"
                    />
                  </Field>

                  <Field label="Topic" hint="Choose the closest match." error={undefined}>
                    <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)} style={selectStyle}>
                      {TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Message"
                    hint="What’s going on? Include details like listing/request IDs if you have them."
                    error={errors.message}
                  >
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your message…"
                      style={textareaError(!!errors.message)}
                      rows={7}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Min 20 characters • Max 2000</div>
                      <div style={{ fontSize: 12, opacity: trimmedMessage.length > 2000 ? 1 : 0.7, fontWeight: 900 }}>
                        {trimmedMessage.length}/2000
                      </div>
                    </div>
                  </Field>

                  {done && !done.ok ? (
                    <div style={errorBand}>
                      <div style={{ fontWeight: 950, color: palette.navy }}>We couldn’t send that</div>
                      <div style={{ marginTop: 4, opacity: 0.8, lineHeight: 1.6 }}>
                        {done.error || "Please try again in a moment."}
                        <div style={{ marginTop: 6 }}>
                          If this keeps happening, email support directly (or try again later).
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <button type="submit" disabled={!canSubmit} style={submitBtn(submitting)}>
                    {submitting ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <span className="pmpSpinner" aria-hidden="true" />
                        Sending…
                      </span>
                    ) : (
                      "Send message"
                    )}
                  </button>

                  <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.6 }}>
                    By submitting, you agree not to include highly sensitive personal data. For account-specific help, include your
                    email and we’ll take it from there.
                  </div>
                </form>
              </>
            )}
          </section>

          <aside className="pmp-hoverLift" style={sideCard}>
            <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>Quick links</div>

            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <Link href="/faq" style={sideLink}>
                <span aria-hidden="true">🧾</span>
                <span>Read FAQs</span>
              </Link>

              <Link href="/browse" style={sideLink}>
                <span aria-hidden="true">🧭</span>
                <span>Browse horses</span>
              </Link>

              <Link href="/" style={sideLink}>
                <span aria-hidden="true">🏡</span>
                <span>Back to home</span>
              </Link>
            </div>

            <div style={softBand}>
              <div style={{ fontWeight: 950, color: palette.navy }}>Tip</div>
              <div style={{ opacity: 0.78, marginTop: 4, lineHeight: 1.6 }}>
                Include any helpful context: date ranges, listing names, or request IDs. The more detail you add, the faster we can
                help.
              </div>
            </div>
          </aside>
        </div>

        <div style={{ height: 26 }} />
      </div>
    </div>
  );
}

function SuccessPanel() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={successBadge}>
        <span aria-hidden="true">✅</span>
        <span>We received your message</span>
      </div>

      <div style={{ fontWeight: 950, fontSize: 18, color: palette.navy }}>Thanks — we’re on it.</div>
      <div style={{ opacity: 0.82, lineHeight: 1.7 }}>
        We’ll reply by email as soon as possible. If you have more details to add, feel free to send another message.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
        <Link href="/browse" style={{ textDecoration: "none" }}>
          <span style={primaryBtn}>Browse horses</span>
        </Link>
        <Link href="/faq" style={{ textDecoration: "none" }}>
          <span style={secondaryBtn}>Back to FAQs</span>
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <label style={{ fontWeight: 950, color: palette.navy }}>{label}</label>
        {hint ? <span style={{ fontSize: 12, opacity: 0.7 }}>{hint}</span> : null}
      </div>
      {children}
      {error ? <div style={{ fontSize: 12, color: "#7a1f1f", fontWeight: 900 }}>{error}</div> : null}
    </div>
  );
}

/* ---------- styles ---------- */

const css = `
  :root { -webkit-tap-highlight-color: transparent; }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
  @keyframes pmpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .pmpSpinner {
    width: 16px; height: 16px;
    border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.45);
    border-top-color: rgba(255,255,255,0.95);
    animation: pmpSpin 700ms linear infinite;
  }
  @media (max-width: 980px) {
    .pmpContactGrid { grid-template-columns: 1fr !important; }
  }
`;

const pageWrap: React.CSSProperties = {
  width: "100%",
};

const container: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "22px 16px 0",
};

const header: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 14,
  padding: 18,
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(245,241,232,0.70) 100%)",
  boxShadow: "0 18px 55px rgba(31,42,68,0.10)",
};

const eyebrowPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(31,61,43,0.08)",
  border: "1px solid rgba(31,61,43,0.12)",
  color: palette.forest,
  fontWeight: 900,
  fontSize: 13,
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 40,
  lineHeight: 1.08,
  letterSpacing: -0.6,
  color: palette.navy,
};

const subtitle: React.CSSProperties = {
  margin: 0,
  opacity: 0.82,
  lineHeight: 1.7,
  maxWidth: 800,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.25fr 0.75fr",
  gap: 14,
} as React.CSSProperties;

(grid as any).className = "pmpContactGrid";

const card: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 18px 55px rgba(31,42,68,0.08)",
  padding: 16,
};

const sideCard: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.80)",
  boxShadow: "0 18px 55px rgba(31,42,68,0.07)",
  padding: 16,
  display: "grid",
  gap: 12,
  alignContent: "start",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 14,
  border: "1px solid rgba(31,42,68,0.14)",
  background: "rgba(255,255,255,0.92)",
  fontWeight: 800,
  color: palette.navy,
};

function inputError(hasError: boolean): React.CSSProperties {
  return {
    ...input,
    border: hasError ? "1px solid rgba(122,31,31,0.35)" : input.border,
    boxShadow: hasError ? "0 0 0 3px rgba(122,31,31,0.12)" : "none",
  };
}

const selectStyle: React.CSSProperties = {
  ...input,
  paddingRight: 10,
};

const textarea: React.CSSProperties = {
  ...input,
  minHeight: 130,
  resize: "vertical",
  fontWeight: 750,
  lineHeight: 1.6,
};

function textareaError(hasError: boolean): React.CSSProperties {
  return {
    ...textarea,
    border: hasError ? "1px solid rgba(122,31,31,0.35)" : textarea.border,
    boxShadow: hasError ? "0 0 0 3px rgba(122,31,31,0.12)" : "none",
  };
}

const submitBtn = (loading: boolean): React.CSSProperties => ({
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  background: loading
    ? "linear-gradient(180deg, rgba(31,61,43,0.78), rgba(23,50,35,0.78))"
    : `linear-gradient(180deg, ${palette.forest}, #173223)`,
  color: "white",
  fontWeight: 950,
  boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
});

const errorBand: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(122,31,31,0.20)",
  background: "linear-gradient(180deg, rgba(122,31,31,0.10), rgba(255,255,255,0.85))",
  padding: 12,
};

const successBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  width: "fit-content",
  padding: "10px 12px",
  borderRadius: 999,
  background: "rgba(31,61,43,0.10)",
  border: "1px solid rgba(31,61,43,0.14)",
  color: palette.forest,
  fontWeight: 950,
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 14,
  background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
  color: "white",
  fontWeight: 950,
  border: "1px solid rgba(0,0,0,0.10)",
  boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
};

const secondaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.75)",
  color: palette.navy,
  fontWeight: 950,
  border: "1px solid rgba(31,42,68,0.18)",
  boxShadow: "0 14px 34px rgba(31,42,68,0.08)",
};

const miniPill: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(31,61,43,0.18)",
  background: "rgba(31,61,43,0.08)",
  color: palette.forest,
};

const miniPillMuted: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(31,42,68,0.14)",
  background: "rgba(31,42,68,0.04)",
  color: palette.navy,
  opacity: 0.85,
};

const sideLink: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 12px",
  borderRadius: 16,
  border: "1px solid rgba(31,42,68,0.10)",
  background: "rgba(31,42,68,0.03)",
  textDecoration: "none",
  color: palette.navy,
  fontWeight: 950,
};

const softBand: React.CSSProperties = {
  marginTop: 2,
  padding: 12,
  borderRadius: 18,
  border: "1px solid rgba(31,42,68,0.10)",
  background: "rgba(31,61,43,0.06)",
};

const honeypotWrap: React.CSSProperties = {
  position: "absolute",
  left: -10000,
  top: -10000,
  width: 1,
  height: 1,
  overflow: "hidden",
};