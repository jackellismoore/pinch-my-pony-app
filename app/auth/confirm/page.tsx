"use client";



import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

function getHashParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  return new URLSearchParams(hash);
}

type OtpType = "signup" | "recovery" | "invite" | "email_change";

function isOtpType(value: string | null): value is OtpType {
  return (
    value === "signup" ||
    value === "recovery" ||
    value === "invite" ||
    value === "email_change"
  );
}

export default function AuthConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("Confirming your email…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function confirmFlow() {
      try {
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        const hashParams = getHashParams();
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");

        // 1) PKCE/code flow
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (cancelled) return;

          setMessage("Email confirmed. Redirecting…");
          router.replace("/verify");
          return;
        }

        // 2) token_hash flow
        if (tokenHash && isOtpType(type)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });

          if (error) throw error;
          if (cancelled) return;

          setMessage(type === "recovery" ? "Recovery link confirmed. Redirecting…" : "Email confirmed. Redirecting…");
          router.replace(type === "recovery" ? "/reset-password" : "/verify");
          return;
        }

        // 4) hash/session flow
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          if (typeof window !== "undefined" && window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }

          if (cancelled) return;

          const recovery = hashType === "recovery";
          setMessage(recovery ? "Recovery link confirmed. Redirecting…" : "Email confirmed. Redirecting…");
          router.replace(recovery ? "/reset-password" : "/verify");
          return;
        }

        throw new Error("Missing confirmation token.");
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Could not confirm email.");
      }
    }

    void confirmFlow();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(900px 420px at 20% 10%, rgba(200,162,77,0.18), transparent 55%), radial-gradient(900px 420px at 90% 30%, rgba(31,61,43,0.14), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 65%)",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: "100%",
          textAlign: "center",
          background: "rgba(255,255,255,0.88)",
          border: "1px solid rgba(31,42,68,0.12)",
          borderRadius: 24,
          boxShadow: "0 22px 60px rgba(31,42,68,0.10)",
          padding: 24,
        }}
      >
        {!error ? (
          <>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(31,61,43,0.16)",
                background: "rgba(31,61,43,0.08)",
                fontSize: 12,
                fontWeight: 950,
                color: "#1F3D2B",
              }}
            >
              Email confirmation
            </div>

            <h1
              style={{
                margin: "16px 0 0",
                fontSize: "clamp(28px, 6vw, 38px)",
                lineHeight: 1.05,
                letterSpacing: -0.4,
                color: "#1F2A44",
                fontWeight: 950,
              }}
            >
              Almost there
            </h1>

            <p
              style={{
                marginTop: 12,
                fontSize: 15,
                lineHeight: 1.7,
                color: "rgba(15,23,42,0.72)",
                fontWeight: 700,
              }}
            >
              {message}
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(220,38,38,0.16)",
                background: "rgba(220,38,38,0.08)",
                fontSize: 12,
                fontWeight: 950,
                color: "#991b1b",
              }}
            >
              Confirmation failed
            </div>

            <h1
              style={{
                margin: "16px 0 0",
                fontSize: "clamp(28px, 6vw, 38px)",
                lineHeight: 1.05,
                letterSpacing: -0.4,
                color: "#1F2A44",
                fontWeight: 950,
              }}
            >
              We couldn’t confirm your email
            </h1>

            <div
              style={{
                marginTop: 14,
                border: "1px solid rgba(255,0,0,0.25)",
                background: "rgba(255,0,0,0.06)",
                padding: 12,
                borderRadius: 14,
                fontSize: 13,
                color: "#7a1f1f",
                fontWeight: 800,
              }}
            >
              {error}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/login"
                style={{
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
                  textDecoration: "none",
                }}
              >
                Go to login
              </Link>

              <Link
                href="/signup"
                style={{
                  color: "#1F3D2B",
                  fontWeight: 900,
                  textDecoration: "none",
                  fontSize: 14,
                  alignSelf: "center",
                }}
              >
                Back to sign up
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

