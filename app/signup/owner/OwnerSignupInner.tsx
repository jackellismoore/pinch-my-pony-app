"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, SUPABASE_ENV_OK } from "@/lib/supabaseClient";

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

  const redirectTo = useMemo(() => sanitizeRedirectTo(searchParams.get("redirectTo")), [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signupOwner() {
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
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Sign up — Owner</h1>
      <p style={{ marginTop: 10, opacity: 0.75, lineHeight: 1.6 }}>
        Create your owner account to list horses, approve requests, and manage availability.
      </p>

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
          Display name (optional)
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" />
        </label>

        <button onClick={signupOwner} disabled={loading}>
          {loading ? "Creating account…" : "Create owner account"}
        </button>

        <div style={{ fontSize: 13, color: "rgba(0,0,0,0.7)" }}>
          Already have an account?{" "}
          <Link href={loginHref} style={{ fontWeight: 900 }}>
            Login
          </Link>
        </div>

        <div style={{ fontSize: 13, opacity: 0.75 }}>
          Want to borrow instead?{" "}
          <Link href={borrowerHref} style={{ fontWeight: 900 }}>
            Borrower signup
          </Link>
        </div>
      </div>
    </div>
  );
}