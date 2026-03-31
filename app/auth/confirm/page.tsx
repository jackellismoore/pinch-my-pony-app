"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function AuthConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("Confirming your email…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function confirmEmail() {
      try {
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (cancelled) return;
          setMessage("Email confirmed. Redirecting…");
          router.replace("/verify");
          return;
        }

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "signup" | "recovery" | "invite" | "email_change",
          });

          if (error) throw error;

          if (cancelled) return;
          setMessage("Email confirmed. Redirecting…");
          router.replace("/verify");
          return;
        }

        throw new Error("Missing confirmation token.");
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Could not confirm email.");
      }
    }

    confirmEmail();

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
      }}
    >
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        {!error ? (
          <div style={{ fontWeight: 950, opacity: 0.85 }}>{message}</div>
        ) : (
          <div>
            <div style={{ fontWeight: 950, color: "#991b1b" }}>{error}</div>
            <div style={{ marginTop: 12 }}>
              <Link href="/login" style={{ fontWeight: 900 }}>
                Go to login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}