"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, SUPABASE_ENV_OK } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

function isValidEmail(v: string) {
  const s = v.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialEmail = useMemo(() => (sp.get("email") ?? "").trim(), [sp]);

  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailTrim = email.trim();
  const emailErr = !emailTrim ? "Email is required." : !isValidEmail(emailTrim) ? "Please enter a valid email." : null;

  async function sendReset() {
    setError(null);
    setDone(false);

    if (!SUPABASE_ENV_OK) {
      setError("Missing Supabase environment variables.");
      return;
    }
    if (emailErr) {
      setError(emailErr);
      return;
    }

    try {
      setSending(true);

      // IMPORTANT: must be allowed in Supabase Auth redirect URLs
      const redirectTo = `${window.location.origin}/reset-password`;

      const res = await supabase.auth.resetPasswordForEmail(emailTrim, { redirectTo });
      if (res.error) throw res.error;

      // Supabase intentionally does not reveal if email exists — good for security.
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send reset email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={wrap()}>
      <div style={container()}>
        <div style={topRow()}>
          <div>
            <div style={pill()}>🔐 Password reset</div>
            <h1 style={title()}>Forgot your password?</h1>
            <div style={sub()}>
              Enter your email and we’ll send you a secure link to set a new password.
            </div>
          </div>

          <button onClick={() => router.push("/login")} style={btn("secondary")} aria-label="Back to login">
            ← Back to login
          </button>
        </div>

        <div style={{ marginTop: 14, ...card() }}>
          {error ? <div style={errorBand()}>{error}</div> : null}

          {done ? (
            <div style={successBand()}>
              <div style={{ fontWeight: 950, color: palette.navy }}>Check your email</div>
              <div style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.7 }}>
                If an account exists for <b>{emailTrim}</b>, a reset link has been sent.
                <div style={{ marginTop: 8 }}>
                  Tip: check your spam/junk folder if you don’t see it.
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={sendReset} style={btn("secondary")}>
                  Resend email
                </button>
                <Link href="/login" style={{ textDecoration: "none" }}>
                  <span style={btn("primary")}>Back to login →</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={label()}>
                  Email
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    style={input(!!(emailTrim && emailErr))}
                    inputMode="email"
                  />
                </label>

                <button onClick={sendReset} disabled={sending} style={btnPrimaryDisabled(sending)}>
                  {sending ? "Sending…" : "Send reset link →"}
                </button>

                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7, lineHeight: 1.7 }}>
                  Remembered it?{" "}
                  <Link href="/login" style={inlineLink()}>
                    Go back to login
                  </Link>
                  .
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.6, textAlign: "center" }}>
          Pinch My Pony · Secure access
        </div>
      </div>
    </div>
  );
}

/* ---- styles ---- */

function wrap(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: "calc(100vh - 64px)",
    background:
      "radial-gradient(900px 420px at 20% 10%, rgba(200,162,77,0.18), transparent 55%), radial-gradient(900px 420px at 90% 30%, rgba(31,61,43,0.14), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 65%)",
    padding: "18px 0 28px",
  };
}

function container(): React.CSSProperties {
  return { padding: 16, maxWidth: 720, margin: "0 auto" };
}

function topRow(): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-end",
    flexWrap: "wrap",
  };
}

function pill(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(31,61,43,0.16)",
    background: "rgba(31,61,43,0.08)",
    color: palette.forest,
    fontWeight: 900,
    fontSize: 12,
    width: "fit-content",
  };
}

function title(): React.CSSProperties {
  return { margin: 0, marginTop: 10, fontSize: 26, fontWeight: 950, color: palette.navy, letterSpacing: -0.3 };
}

function sub(): React.CSSProperties {
  return { marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.72)", lineHeight: 1.7 };
}

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(31,42,68,0.12)",
    borderRadius: 22,
    padding: 18,
    background: "rgba(255,255,255,0.80)",
    boxShadow: "0 16px 44px rgba(31,42,68,0.08)",
    backdropFilter: "blur(6px)",
  };
}

function label(): React.CSSProperties {
  return {
    display: "grid",
    gap: 6,
    fontSize: 13,
    color: "rgba(31,42,68,0.78)",
    fontWeight: 850,
  };
}

function input(hasError: boolean): React.CSSProperties {
  return {
    border: hasError ? "1px solid rgba(122,31,31,0.35)" : "1px solid rgba(31,42,68,0.16)",
    borderRadius: 14,
    padding: "12px 12px",
    fontSize: 14,
    background: "rgba(255,255,255,0.90)",
    outline: "none",
    boxShadow: hasError ? "0 0 0 3px rgba(122,31,31,0.12)" : "none",
  };
}

function btn(kind: "primary" | "secondary"): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 14,
    padding: "11px 14px",
    fontSize: 13,
    fontWeight: 950,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    whiteSpace: "nowrap",
    cursor: "pointer",
    border: "1px solid rgba(0,0,0,0.10)",
  };

  if (kind === "primary") {
    return {
      ...base,
      background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
      color: "white",
      boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
    };
  }

  return {
    ...base,
    background: "rgba(255,255,255,0.78)",
    color: palette.navy,
    border: "1px solid rgba(31,42,68,0.18)",
    boxShadow: "0 12px 30px rgba(31,42,68,0.06)",
  };
}

function btnPrimaryDisabled(disabled: boolean): React.CSSProperties {
  return {
    ...btn("primary"),
    opacity: disabled ? 0.75 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function errorBand(): React.CSSProperties {
  return {
    marginBottom: 12,
    border: "1px solid rgba(255,0,0,0.25)",
    background: "rgba(255,0,0,0.06)",
    padding: 12,
    borderRadius: 14,
    fontSize: 13,
    fontWeight: 850,
  };
}

function successBand(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(31,61,43,0.18)",
    background: "rgba(31,61,43,0.08)",
    padding: 14,
  };
}

function inlineLink(): React.CSSProperties {
  return {
    color: palette.forest,
    fontWeight: 900,
    textDecoration: "none",
    borderBottom: "2px solid rgba(200,162,77,0.45)",
    paddingBottom: 1,
  };
}