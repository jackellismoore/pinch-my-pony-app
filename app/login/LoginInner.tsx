"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase, SUPABASE_ENV_OK } from "@/lib/supabaseClient";

type ProfileGate = {
  id: string;
  role: "owner" | "borrower" | null;
  verification_status: string | null;
};

function sanitizeRedirectTo(v: string | null) {
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

async function routeAfterLogin(userId: string, fallbackRedirect: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, verification_status")
    .eq("id", userId)
    .maybeSingle();

  const profile = !error ? (data as ProfileGate | null) : null;
  const role = profile?.role ?? null;
  const status = profile?.verification_status ?? "unverified";

  if (status !== "verified") {
    window.location.replace("/verify");
    return;
  }

  if (
    fallbackRedirect &&
    fallbackRedirect !== "/" &&
    fallbackRedirect !== "/login" &&
    fallbackRedirect !== "/signup"
  ) {
    window.location.replace(fallbackRedirect);
    return;
  }

  window.location.replace(role === "owner" ? "/dashboard/owner" : "/dashboard/borrower");
}

export default function LoginInner() {
  const searchParams = useSearchParams();

  const redirectTo = useMemo(
    () => sanitizeRedirectTo(searchParams.get("redirectTo")),
    [searchParams]
  );

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

  const pwdErr = !pwdTrim
    ? "Password is required."
    : pwdTrim.length < 6
    ? "Password looks too short."
    : null;

  const canSubmit = !loading && !emailErr && !pwdErr;

  async function login(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
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

      const res = await supabase.auth.signInWithPassword({
        email: emailTrim,
        password,
      });

      if (res.error) throw res.error;

      const userId = res.data.user?.id;
      if (!userId) throw new Error("Signed in, but no user was returned.");

      await routeAfterLogin(userId, redirectTo);
      return;
    } catch (err: any) {
      setError(err?.message ?? "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  const signupHref = `/signup?redirectTo=${encodeURIComponent(redirectTo)}`;
  const forgotHref = `/forgot-password?email=${encodeURIComponent(emailTrim || "")}`;

  return (
    <div style={pageWrap}>
      <style>{css}</style>

      <section style={heroSection}>
        <div style={heroBg} aria-hidden="true" />

        <div style={container}>
          <div className="pmp-authGrid">
            <div style={leftCol}>
              <div style={eyebrowPill}>
                <span aria-hidden="true">🐴</span>
                <span>Welcome back</span>
              </div>

              <h1 style={title}>
                Sign in to <span style={accent}>ride with confidence</span>.
              </h1>

              <p style={subtitle}>
                Pinch My Pony keeps borrowing simple, warm, and organised — with messaging,
                requests, and clear owner communication built in.
              </p>

              <div style={tipCard}>
                <div style={tipTitle}>New here?</div>
                <div style={tipText}>
                  Create an account to browse horses, request rides, and message owners.
                </div>

                <div style={tipActions}>
                  <Link href={signupHref} style={linkReset}>
                    <span style={secondaryBtn}>Create account</span>
                  </Link>
                  <Link href="/faq" style={linkReset}>
                    <span style={ghostBtn}>Read FAQs</span>
                  </Link>
                </div>
              </div>
            </div>

            <div style={rightCol}>
              <div style={card}>
                <div style={cardTopRow}>
                  <div style={logoRow}>
                    <div style={logoBadge} aria-hidden="true">
                      <img
                        src="/pmp-logo-web.png"
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          objectPosition: "center",
                          display: "block",
                        }}
                      />
                    </div>

                    <div style={{ lineHeight: 1.15 }}>
                      <div style={{ fontWeight: 950, fontSize: 18, color: palette.navy }}>
                        Login
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.72 }}>
                        Secure access
                      </div>
                    </div>
                  </div>

                  <span style={pill}>
                    <span aria-hidden="true">🔐</span>
                    <span>Protected</span>
                  </span>
                </div>

                {error ? (
                  <div style={errorBand} role="alert" aria-live="polite">
                    <div style={{ fontWeight: 950, color: palette.navy }}>
                      We couldn’t sign you in
                    </div>
                    <div style={{ marginTop: 4, opacity: 0.82, lineHeight: 1.6 }}>{error}</div>
                  </div>
                ) : null}

                <form onSubmit={login} style={formGrid} autoComplete="on" noValidate>
                  <Field
                    label="Email"
                    htmlFor="login-email"
                    hint="Use the address you signed up with."
                    error={emailTrim ? emailErr : null}
                  >
                    <input
                      id="login-email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      style={inputStyle(!!(emailTrim && emailErr))}
                      inputMode="email"
                    />
                  </Field>

                  <Field
                    label="Password"
                    htmlFor="login-password"
                    hint="At least 6 characters."
                    error={pwdTrim ? pwdErr : null}
                  >
                    <input
                      id="login-password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      style={inputStyle(!!(pwdTrim && pwdErr))}
                    />
                  </Field>

                  <div style={inlineLinksRow}>
                    <Link href={forgotHref} style={inlineLink}>
                      Forgot password?
                    </Link>

                    <Link href={signupHref} style={inlineLink}>
                      New here? Sign up
                    </Link>
                  </div>

                  <button type="submit" disabled={!canSubmit} style={primaryBtn(loading, canSubmit)}>
                    {loading ? "Logging in…" : "Login"}
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
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <label htmlFor={htmlFor} style={{ fontWeight: 950, color: palette.navy }}>
          {label}
        </label>
        {hint ? <span style={{ fontSize: 12, opacity: 0.7 }}>{hint}</span> : null}
      </div>
      {children}
      {error ? <div style={{ fontSize: 12, color: "#7a1f1f", fontWeight: 900 }}>{error}</div> : null}
    </div>
  );
}

const css = `
  :root { -webkit-tap-highlight-color: transparent; }

  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }

  .pmp-authGrid {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 460px);
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 900px) {
    .pmp-authGrid {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }

  @media (max-width: 767px) {
    .pmp-authGrid {
      gap: 14px;
    }
  }
`;

const pageWrap: React.CSSProperties = { width: "100%" };
const container: React.CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "0 12px" };
const heroSection: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  padding: "16px 0 24px",
  background: palette.cream,
  borderRadius: 24,
};
const heroBg: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(900px 420px at 20% 10%, rgba(200,162,77,0.18), transparent 55%), radial-gradient(900px 420px at 90% 30%, rgba(31,61,43,0.14), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 68%)",
};
const leftCol: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gap: 14,
  alignContent: "start",
  paddingTop: 6,
  minWidth: 0,
};
const rightCol: React.CSSProperties = { position: "relative", zIndex: 1, minWidth: 0 };
const eyebrowPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  width: "fit-content",
  maxWidth: "100%",
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
  fontSize: "clamp(28px, 7vw, 56px)",
  lineHeight: 1.02,
  letterSpacing: -0.8,
  color: palette.navy,
  maxWidth: 760,
};
const accent: React.CSSProperties = {
  color: palette.forest,
  textDecoration: "underline",
  textDecorationThickness: "6px",
  textUnderlineOffset: "6px",
  textDecorationColor: "rgba(200,162,77,0.42)",
};
const subtitle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(15px, 3.8vw, 18px)",
  lineHeight: 1.7,
  opacity: 0.9,
  maxWidth: 640,
};
const tipCard: React.CSSProperties = {
  marginTop: 2,
  padding: 16,
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.78)",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
  maxWidth: 520,
};
const tipTitle: React.CSSProperties = { fontWeight: 950, fontSize: 16, color: palette.navy };
const tipText: React.CSSProperties = {
  marginTop: 6,
  fontSize: 15,
  lineHeight: 1.65,
  color: "rgba(15,23,42,0.76)",
};
const tipActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
};
const card: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,241,232,0.74) 100%)",
  boxShadow: "0 22px 60px rgba(31,42,68,0.12)",
  padding: 16,
  minWidth: 0,
};
const cardTopRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
  flexWrap: "wrap",
};
const logoRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
};
const logoBadge: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,247,240,0.96))",
  border: "1px solid rgba(15,23,42,0.10)",
  boxShadow: "0 14px 34px rgba(15,23,42,0.10)",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  flexShrink: 0,
  padding: 6,
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
  maxWidth: "100%",
};
const errorBand: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(122,31,31,0.20)",
  background: "linear-gradient(180deg, rgba(122,31,31,0.10), rgba(255,255,255,0.85))",
  padding: 12,
  marginBottom: 12,
};
const formGrid: React.CSSProperties = { display: "grid", gap: 14 };
const baseInput: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(31,42,68,0.14)",
  background: "rgba(255,255,255,0.95)",
  fontWeight: 800,
  color: palette.navy,
  fontSize: 16,
};
function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    ...baseInput,
    border: hasError ? "1px solid rgba(122,31,31,0.35)" : baseInput.border,
    boxShadow: hasError ? "0 0 0 3px rgba(122,31,31,0.12)" : "none",
  };
}
const primaryBtn = (loading: boolean, enabled: boolean): React.CSSProperties => ({
  width: "100%",
  minHeight: 50,
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  background: enabled
    ? `linear-gradient(180deg, ${palette.forest}, #173223)`
    : "linear-gradient(180deg, rgba(31,61,43,0.55), rgba(23,50,35,0.55))",
  color: "white",
  fontWeight: 950,
  fontSize: 16,
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
  minHeight: 44,
  padding: "10px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.88)",
  color: palette.navy,
  fontWeight: 950,
  border: "1px solid rgba(31,42,68,0.18)",
  boxShadow: "0 14px 34px rgba(31,42,68,0.08)",
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "10px 14px",
  borderRadius: 14,
  background: "rgba(31,42,68,0.04)",
  color: palette.navy,
  fontWeight: 950,
  border: "1px solid rgba(31,42,68,0.14)",
};
const inlineLinksRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};
const fineRow: React.CSSProperties = { display: "flex", justifyContent: "center", paddingTop: 2 };
const inlineLink: React.CSSProperties = {
  color: palette.forest,
  fontWeight: 900,
  textDecoration: "none",
};
const linkReset: React.CSSProperties = { textDecoration: "none" };