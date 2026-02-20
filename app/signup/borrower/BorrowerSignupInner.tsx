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

export default function BorrowerSignupInner() {
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

  async function signupBorrower() {
    setError(null);

    if (!SUPABASE_ENV_OK) {
      setError("Missing Supabase environment variables.");
      return;
    }

    try {
      setLoading(true);

      const res = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim() || null,
            role: "borrower",
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

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Sign up — Borrower</h1>

      {error && (
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
      )}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label>
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>

        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </label>

        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </label>

        <button onClick={signupBorrower} disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>

        <div style={{ fontSize: 13 }}>
          Already have an account?{" "}
          <Link href={loginHref}>Login</Link>
        </div>
      </div>
    </div>
  );
}