"use client";

export const dynamic = "force-dynamic";

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

// Prevent open redirects: allow only internal paths.
function sanitizeRedirectTo(v: string | null): string {
  if (!v) return "/";
  if (!v.startsWith("/")) return "/";
  if (v.startsWith("//")) return "/";
  if (v === "/login" || v === "/signup") return "/";
  return v;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => sanitizeRedirectTo(searchParams.get("redirectTo")), [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setError(null);

    if (!SUPABASE_ENV_OK) {
      setError("Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    const e = email.trim();
    if (!e || !password) {
      setError("Enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await withTimeout(
        supabase.auth.signInWithPassword({ email: e, password }),
        15000,
        "signInWithPassword"
      );

      if (res.error) throw res.error;

      router.replace(redirectTo);
      router.refresh();
    } catch (err: any) {
      const msg = String(err?.message ?? "Login failed.");
      if (msg.toLowerCase().includes("timed out")) {
        setError(
          "Login request timed out. This usually means the Supabase request is blocked or slow. " +
            "Try again, and if it persists: check browser console/network + Supabase Auth settings."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const signupHref = `/signup?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Login</h1>

      {error ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.06)",
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" style={inputStyle} />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            style={inputStyle}
          />
        </label>

        <button onClick={login} disabled={loading} style={buttonStyle(loading)}>
          {loading ? "Logging in…" : "Login"}
        </button>

        <div style={{ fontSize: 13, color: "rgba(0,0,0,0.7)" }}>
          No account?{" "}
          <Link href={signupHref} style={{ fontWeight: 900 }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.14)",
  borderRadius: 12,
  padding: "12px 12px",
  fontSize: 14,
  background: "rgba(0,0,0,0.03)",
};

function buttonStyle(loading: boolean): React.CSSProperties {
  return {
    marginTop: 6,
    border: "1px solid rgba(0,0,0,0.14)",
    borderRadius: 14,
    padding: "12px 14px",
    background: loading ? "rgba(0,0,0,0.06)" : "black",
    color: loading ? "rgba(0,0,0,0.55)" : "white",
    cursor: loading ? "not-allowed" : "pointer",
    fontWeight: 950,
    fontSize: 15,
  };
}