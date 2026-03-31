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
        // 🔥 support BOTH formats
        const token_hash =
          searchParams.get("token_hash") || searchParams.get("token");

        const type = searchParams.get("type");

        console.log("CONFIRM PARAMS:", {
          token_hash,
          type,
          fullUrl: window.location.href,
        });

        if (!token_hash || !type) {
          throw new Error("Missing confirmation token.");
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as "signup" | "recovery" | "invite" | "email_change",
        });

        if (error) throw error;
        if (cancelled) return;

        setMessage("Email confirmed. Redirecting…");

        // give it a second so session settles
        setTimeout(() => {
          router.replace("/verify");
        }, 1000);
      } catch (e: any) {
        if (cancelled) return;

        console.error("CONFIRM ERROR:", e);

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