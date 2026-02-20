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

function sanitizeRedirectTo(v: string | null): string {
  if (!v) return "/browse";
  if (!v.startsWith("/")) return "/browse";
  if (v.startsWith("//")) return "/browse";
  if (v === "/login" || v === "/signup") return "/browse";
  return v;
}

export default function OwnerSignupPage() {
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

      const res = await withTimeout(
        supabase.auth.signUp({
          email: e,
          password,
          options: {
            data: {
              display_name: displayName.trim() || null,
              role: "owner",
            },
          },
        }),
        15000,
        "signUp"
      );

      if (res.error) throw res.error;

      const user = res.data.user;

      // If you have a DB trigger that creates profiles automatically, this upsert is optional.
      if (user) {
        const { error: pErr } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              role: "owner",
              display_name: displayName.trim() || null,
            },
            { onConflict: "id" }
          );

        if (pErr) console.warn("Profile upsert warning:", pErr.message);
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (err: any) {
      const msg = String(err?.message ?? "Sign up failed.");
      if (msg.toLowerCase().includes("timed out")) {
        setError("Sign up request timed out. Try again, and check Supabase Auth settings if it persists.");
      } else {
        setError(msg);
      }
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
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} type="text" autoComplete="nickname" style={inputStyle} />
        </label>

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
            autoComplete="new-password"
            style={inputStyle}
          />
        </label>

        <button onClick={signupOwner} disabled={loading} style={buttonStyle(loading)}>
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