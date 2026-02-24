"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, SUPABASE_ENV_OK } from "@/lib/supabaseClient";

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

function sanitizeRedirectTo(v: string | null): string {
  if (!v) return "/";
  if (!v.startsWith("/")) return "/";
  if (v.startsWith("//")) return "/";
  if (v === "/login" || v === "/signup") return "/";
  return v;
}

const palette = {
  forest: "#1F3D2B",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

function isValidEmail(v: string) {
  const s = v.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => sanitizeRedirectTo(searchParams.get("redirectTo")), [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailTrim = email.trim();
  const pwdTrim = password;

  const emailErr = !emailTrim
    ? "Email is required."
    : !isValidEmail(emailTrim)
      ? "Please enter a valid email."
      : null;

  const pwdErr = !pwdTrim ? "Password is required." : pwdTrim.length < 6 ? "Password looks too short." : null;

  const canSubmit = !loading && !emailErr && !pwdErr;

  async function login() {
    setError(null);

    if (!SUPABASE_ENV_OK) {
      setError("Missing Supabase environment variables.");
      return;
    }

    if (!canSubmit) {
      if (emailErr) return setError(emailErr);
      if (pwdErr) return setError(pwdErr);
      return;
    }

    try {
      setLoading(true);

      const res = await withTimeout(
        supabase.auth.signInWithPassword({
          email: emailTrim,
          password,
        }),
        15000,
        "signInWithPassword"
      );

      if (res.error) throw res.error;

      router.replace(redirectTo);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  const signupHref = `/signup?redirectTo=${encodeURIComponent(redirectTo)}`;
  const forgotHref = `/forgot-password?email=${encodeURIComponent(emailTrim || "")}`;

  return (
    <div style={fullBleedWrap}>
      <style>{css}</style>

      <section style={heroSection} aria-label="Login">
        <div style={heroBg} aria-hidden="true" />
        <div className="pmp-driftA" style={heroFloatA} aria-hidden="true" />
        <div className="pmp-driftB" style={heroFloatB} aria-hidden="true" />

        <div style={container}>
          <div style={grid}>
            {/* Left */}
            <div style={{ display: "grid", gap: 12 }}>
              <div style={eyebrowPill}>
                <span aria-hidden="true">🐴</span>
                <span>Welcome back</span>
              </div>

              <h1 style={title}>
                Sign in to <span style={accent}>ride with confidence</span>.
              </h1>

              <p style={subtitle}>
                Pinch My Pony keeps borrowing simple, warm, and organized — with messaging and clear guardrails built in.
              </p>

              <div className="pmp-hoverLift" style={miniBand}>
                <div style={{ fontWeight: 950, color: palette.navy }}>Tip</div>
                <div style={{ opacity: 0.78, marginTop: 4, lineHeight: 1.6 }}>
                  If you’re new, create an account to request dates and message owners.
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <Link href={signupHref} style={{ textDecoration: "none" }}>
                    <span style={secondaryBtn}>Create account</span>
                  </Link>
                  <Link href="/faq" style={{ textDecoration: "none" }}>
                    <span style={ghostBtn}>Read FAQs</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="pmp-hoverLift" style={card}>
              <div style={cardTopRow}>
                <div style={logoRow}>
                  <div style={logoBadge} aria-hidden="true">
                    <img
                      src="/pmp-logo.png"
                      alt=""
                      style={{ width: "86%", height: "86%", objectFit: "contain", display: "block" }}
                    />
                  </div>
                  <div style={{ lineHeight: 1.15 }}>
                    <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>Login</div>
                    <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.72 }}>Secure access</div>
                  </div>
                </div>

                <span style={pill}>
                  <span aria-hidden="true">🔐</span>
                  <span>Protected</span>
                </span>
              </div>

              {error ? (
                <div style={errorBand} role="alert" aria-live="polite">
                  <div style={{ fontWeight: 950, color: palette.navy }}>We couldn’t sign you in</div>
                  <div style={{ marginTop: 4, opacity: 0.82, lineHeight: 1.6 }}>{error}</div>
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 12 }}>
                <Field label="Email" hint="Use the address you signed up with." error={emailTrim ? emailErr : null}>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    style={inputStyle(!!(emailTrim && emailErr))}
                    inputMode="email"
                  />
                </Field>

                <Field label="Password" hint="At least 6 characters." error={pwdTrim ? pwdErr : null}>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    style={inputStyle(!!(pwdTrim && pwdErr))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") login();
                    }}
                  />
                </Field>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <Link href={forgotHref} style={inlineLink}>
                    Forgot password?
                  </Link>

                  <Link href={signupHref} style={inlineLink}>
                    New here? Sign up
                  </Link>
                </div>

                <button onClick={login} disabled={!canSubmit} style={primaryBtn(loading, canSubmit)}>
                  {loading ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <span className="pmpSpinner" aria-hidden="true" />
                      Logging in…
                    </span>
                  ) : (
                    "Login"
                  )}
                </button>

                <div style={fineRow}>
                  <div style={{ fontSize: 13, opacity: 0.78 }}>
                    <Link href="/contact" style={inlineLink}>
                      Contact
                    </Link>{" "}
                    <span style={{ opacity: 0.5 }}>•</span>{" "}
                    <Link href="/faq" style={inlineLink}>
                      FAQs
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 28 }} />
        </div>
      </section>
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
  error?: string | null;
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

/* ---------- styling ---------- */

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

  @keyframes pmpDriftA { 0% { transform: translate3d(0,0,0) } 50% { transform: translate3d(10px,-8px,0) } 100% { transform: translate3d(0,0,0) } }
  @keyframes pmpDriftB { 0% { transform: translate3d(0,0,0) } 50% { transform: translate3d(-12px,10px,0) } 100% { transform: translate3d(0,0,0) } }
  .pmp-driftA { animation: pmpDriftA 12s ease-in-out infinite; }
  .pmp-driftB { animation: pmpDriftB 14s ease-in-out infinite; }

  @media (max-width: 980px) {
    .pmp-login-grid { grid-template-columns: 1fr !important; }
  }
`;

const fullBleedWrap: React.CSSProperties = {
  width: "100vw",
  marginLeft: "calc(50% - 50vw)",
};

const container: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "0 16px",
};

const heroSection: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  padding: "44px 0 28px",
  background: palette.cream,
};

const heroBg: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(900px 420px at 20% 10%, rgba(200,162,77,0.22), transparent 55%), radial-gradient(900px 420px at 90% 30%, rgba(31,61,43,0.18), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 65%)",
};

const heroFloatA: React.CSSProperties = {
  position: "absolute",
  width: 520,
  height: 520,
  borderRadius: 999,
  left: -160,
  top: 120,
  background: "radial-gradient(circle at 30% 30%, rgba(200,162,77,0.18), transparent 60%)",
  filter: "blur(2px)",
  opacity: 0.9,
  pointerEvents: "none",
};

const heroFloatB: React.CSSProperties = {
  position: "absolute",
  width: 560,
  height: 560,
  borderRadius: 999,
  right: -180,
  top: -40,
  background: "radial-gradient(circle at 40% 35%, rgba(31,61,43,0.14), transparent 60%)",
  filter: "blur(2px)",
  opacity: 0.85,
  pointerEvents: "none",
};

const grid: React.CSSProperties = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "1.05fr 0.95fr",
  gap: 16,
  alignItems: "start",
} as React.CSSProperties;

(grid as any).className = "pmp-login-grid";

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
  fontSize: 44,
  lineHeight: 1.06,
  letterSpacing: -0.6,
  color: palette.navy,
};

const accent: React.CSSProperties = {
  color: palette.forest,
  textDecoration: "underline",
  textDecorationThickness: "6px",
  textUnderlineOffset: "6px",
  textDecorationColor: "rgba(200,162,77,0.45)",
};

const subtitle: React.CSSProperties = {
  margin: 0,
  fontSize: 16.5,
  lineHeight: 1.75,
  opacity: 0.9,
  maxWidth: 620,
};

const miniBand: React.CSSProperties = {
  marginTop: 6,
  padding: 14,
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.72)",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
};

const card: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(245,241,232,0.70) 100%)",
  boxShadow: "0 22px 60px rgba(31,42,68,0.12)",
  padding: 16,
};

const cardTopRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 10,
};

const logoRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const logoBadge: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,247,240,0.96))",
  border: "1px solid rgba(15,23,42,0.10)",
  boxShadow: "0 14px 34px rgba(15,23,42,0.10)",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid rgba(31,61,43,0.14)",
  background: "rgba(31,61,43,0.08)",
  color: palette.forest,
  fontWeight: 950,
  fontSize: 12,
};

const errorBand: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(122,31,31,0.20)",
  background: "linear-gradient(180deg, rgba(122,31,31,0.10), rgba(255,255,255,0.85))",
  padding: 12,
  marginBottom: 12,
};

const baseInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 14,
  border: "1px solid rgba(31,42,68,0.14)",
  background: "rgba(255,255,255,0.92)",
  fontWeight: 800,
  color: palette.navy,
};

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    ...baseInput,
    border: hasError ? "1px solid rgba(122,31,31,0.35)" : baseInput.border,
    boxShadow: hasError ? "0 0 0 3px rgba(122,31,31,0.12)" : "none",
  };
}

const primaryBtn = (loading: boolean, enabled: boolean): React.CSSProperties => ({
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  background: enabled
    ? `linear-gradient(180deg, ${palette.forest}, #173223)`
    : "linear-gradient(180deg, rgba(31,61,43,0.55), rgba(23,50,35,0.55))",
  color: "white",
  fontWeight: 950,
  boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: loading ? 0.92 : 1,
});

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

const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 14,
  background: "rgba(31,42,68,0.04)",
  color: palette.navy,
  fontWeight: 950,
  border: "1px solid rgba(31,42,68,0.14)",
};

const fineRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 2,
};

const inlineLink: React.CSSProperties = {
  fontWeight: 950,
  color: palette.forest,
  textDecoration: "underline",
  textUnderlineOffset: 3,
  textDecorationColor: "rgba(200,162,77,0.55)",
};