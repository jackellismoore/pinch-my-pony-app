"use client";

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

function sanitizeRedirectTo(v: string | null): string {
  if (!v) return "/";
  if (!v.startsWith("/")) return "/";
  if (v.startsWith("//")) return "/";
  if (v === "/login" || v === "/signup") return "/";
  return v;
}

const pageBg = `radial-gradient(900px 420px at 20% 0%, rgba(200,162,77,0.18), transparent 55%),
                radial-gradient(900px 420px at 90% 18%, rgba(31,61,43,0.14), transparent 58%),
                linear-gradient(180deg, ${palette.cream} 0%, rgba(250,250,250,1) 68%)`;

const card: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 22px 60px rgba(31,42,68,0.10)",
};

const input: React.CSSProperties = {
  border: "1px solid rgba(31,42,68,0.16)",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
  background: "rgba(255,255,255,0.88)",
  outline: "none",
};

const btn = (kind: "primary" | "secondary") =>
  ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 950,
    whiteSpace: "nowrap",
    border: "1px solid rgba(31,42,68,0.16)",
    background:
      kind === "primary"
        ? `linear-gradient(180deg, ${palette.forest}, #173223)`
        : "rgba(255,255,255,0.72)",
    color: kind === "primary" ? "white" : palette.navy,
    boxShadow:
      kind === "primary"
        ? "0 14px 34px rgba(31,61,43,0.18)"
        : "0 14px 34px rgba(31,42,68,0.08)",
    cursor: "pointer",
  }) as React.CSSProperties;

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
  const borrowerHref = `/signup/borrower?redirectTo=${encodeURIComponent(
    redirectTo
  )}`;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        background: pageBg,
        padding: "22px 16px 34px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(31,42,68,0.12)",
              background: "rgba(255,255,255,0.72)",
              boxShadow: "0 14px 34px rgba(31,42,68,0.08)",
              fontSize: 12,
              fontWeight: 950,
              color: palette.navy,
            }}
          >
            Pinch My Pony · Owner
          </div>

          <h1
            style={{
              margin: "14px 0 0",
              fontSize: 30,
              letterSpacing: -0.4,
              color: palette.navy,
              fontWeight: 950,
            }}
          >
            Create your owner account
          </h1>

          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "rgba(0,0,0,0.62)",
              lineHeight: 1.6,
            }}
          >
            List horses, approve requests, and manage availability.
          </div>
        </div>

        <div style={{ ...card, padding: 16 }}>
          {error ? (
            <div
              style={{
                marginBottom: 12,
                border: "1px solid rgba(255,0,0,0.25)",
                background: "rgba(255,0,0,0.06)",
                padding: 12,
                borderRadius: 14,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 12 }}>
            <label
              style={{
                display: "grid",
                gap: 6,
                fontSize: 13,
                color: "rgba(0,0,0,0.75)",
                fontWeight: 800,
              }}
            >
              Display name (optional)
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={input}
                placeholder="e.g. Jack"
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
                fontSize: 13,
                color: "rgba(0,0,0,0.75)",
                fontWeight: 800,
              }}
            >
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                style={input}
                placeholder="you@example.com"
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
                fontSize: 13,
                color: "rgba(0,0,0,0.75)",
                fontWeight: 800,
              }}
            >
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                style={input}
                placeholder="••••••••"
              />
            </label>

            <button
              onClick={signupOwner}
              disabled={loading}
              style={{ ...btn("primary"), opacity: loading ? 0.75 : 1 }}
            >
              {loading ? "Creating account…" : "Create owner account"}
            </button>

            <div style={{ height: 1, background: "rgba(31,42,68,0.10)" }} />

            <div style={{ fontSize: 13, color: "rgba(0,0,0,0.70)" }}>
              Already have an account?{" "}
              <Link href={loginHref} style={{ fontWeight: 950, color: palette.navy }}>
                Login
              </Link>
            </div>

            <div style={{ fontSize: 13, color: "rgba(0,0,0,0.62)" }}>
              Want to borrow instead?{" "}
              <Link href={borrowerHref} style={{ fontWeight: 950, color: palette.navy }}>
                Borrower signup
              </Link>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "rgba(0,0,0,0.55)", textAlign: "center" }}>
          By creating an account you agree to the marketplace terms.
        </div>
      </div>
    </div>
  );
}