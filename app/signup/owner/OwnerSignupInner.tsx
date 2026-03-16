"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, SUPABASE_ENV_OK } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  cream: "#F5F1E8",
  navy: "#1F2A44",
};

function sanitizeRedirectTo(v: string | null): string {
  if (!v) return "/";
  if (!v.startsWith("/")) return "/";
  if (v.startsWith("//")) return "/";
  if (v === "/login" || v === "/signup") return "/";
  return v;
}

export default function OwnerSignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(
    () => sanitizeRedirectTo(searchParams.get("redirectTo")),
    [searchParams]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signupOwner() {
    setError(null);

    if (!SUPABASE_ENV_OK) {
      setError(
        "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    const e = email.trim();
    if (!e || !password) {
      setError("Enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await supabase.auth.signUp({
        email: e,
        password,
        options: {
          data: {
            display_name: displayName.trim() || null,
            role: "owner",
          },
        },
      });

      if (res.error) throw res.error;

      router.replace(redirectTo);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  const loginHref = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  const borrowerHref = `/signup/borrower?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <div style={wrap}>
      <div style={bg} aria-hidden="true" />

      <div style={container}>
        <div style={card}>
          <div style={eyebrow}>Pinch My Pony · Owner</div>

          <h1 style={title}>Create your owner account</h1>

          <p style={subtitle}>
            List horses, manage availability, and approve rider requests from one place.
          </p>

          {error ? <div style={errorBox}>{error}</div> : null}

          <div style={formGrid}>
            <Field label="Display name (optional)">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={input}
                placeholder="e.g. Jack"
              />
            </Field>

            <Field label="Email">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                style={input}
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Password">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                style={input}
                placeholder="••••••••"
              />
            </Field>

            <button
              onClick={signupOwner}
              disabled={loading}
              style={{ ...primaryBtn, opacity: loading ? 0.75 : 1 }}
            >
              {loading ? "Creating account…" : "Create owner account"}
            </button>

            <div style={footerLinks}>
              <Link href={loginHref} style={inlineLink}>
                Already have an account?
              </Link>
              <Link href={borrowerHref} style={inlineLink}>
                I want to borrow a horse instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const wrap: React.CSSProperties = {
  position: "relative",
  minHeight: "calc(100vh - 60px)",
  overflow: "hidden",
  background: palette.cream,
  padding: "22px 16px 34px",
};

const bg: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(900px 420px at 20% 0%, rgba(200,162,77,0.18), transparent 55%), radial-gradient(900px 420px at 90% 18%, rgba(31,61,43,0.14), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 68%)",
};

const container: React.CSSProperties = {
  position: "relative",
  maxWidth: 560,
  margin: "0 auto",
};

const card: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.88)",
  boxShadow: "0 22px 60px rgba(31,42,68,0.10)",
  padding: 20,
};

const eyebrow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.72)",
  fontSize: 12,
  fontWeight: 950,
  color: palette.navy,
};

const title: React.CSSProperties = {
  margin: "14px 0 0",
  fontSize: "clamp(28px, 6vw, 38px)",
  lineHeight: 1.05,
  letterSpacing: -0.4,
  color: palette.navy,
  fontWeight: 950,
};

const subtitle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 15,
  lineHeight: 1.7,
  color: "rgba(15,23,42,0.72)",
};

const errorBox: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid rgba(255,0,0,0.25)",
  background: "rgba(255,0,0,0.06)",
  padding: 12,
  borderRadius: 14,
  fontSize: 13,
};

const formGrid: React.CSSProperties = {
  marginTop: 16,
  display: "grid",
  gap: 14,
};

const field: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  color: "rgba(0,0,0,0.75)",
  fontWeight: 800,
};

const input: React.CSSProperties = {
  border: "1px solid rgba(31,42,68,0.16)",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 15,
  background: "rgba(255,255,255,0.92)",
  outline: "none",
  minHeight: 48,
};

const primaryBtn: React.CSSProperties = {
  minHeight: 50,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(31,42,68,0.16)",
  background: "linear-gradient(180deg, #1F3D2B, #173223)",
  color: "white",
  fontSize: 15,
  fontWeight: 950,
  boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
  cursor: "pointer",
};

const footerLinks: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const inlineLink: React.CSSProperties = {
  color: palette.forest,
  fontWeight: 900,
  textDecoration: "none",
  fontSize: 14,
};