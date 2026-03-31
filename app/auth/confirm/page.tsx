"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileGate = {
  id: string;
  role: "owner" | "borrower" | null;
  verification_status: string | null;
};

export default function AuthConfirmPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your email…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
        const hashParams = new URLSearchParams(hash);

        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (type === "signup" && access_token && refresh_token) {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionErr) throw sessionErr;
        }

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw userErr;
        if (!user) {
          throw new Error("Email confirmed, but no user session was found.");
        }

        const { data, error: profileErr } = await supabase
          .from("profiles")
          .select("id, role, verification_status")
          .eq("id", user.id)
          .maybeSingle();

        if (profileErr) throw profileErr;

        const profile = (data ?? null) as ProfileGate | null;
        const status = profile?.verification_status ?? "unverified";

        if (cancelled) return;

        setMessage("Email confirmed. Redirecting…");

        if (status !== "verified") {
          router.replace("/verify");
          return;
        }

        router.replace(profile?.role === "owner" ? "/dashboard/owner" : "/dashboard/borrower");
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Could not confirm email.");
        setMessage("");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        {message ? (
          <div style={{ fontWeight: 950, opacity: 0.85 }}>{message}</div>
        ) : null}

        {error ? (
          <div>
            <div style={{ fontWeight: 950, color: "#991b1b" }}>{error}</div>
            <div style={{ marginTop: 12 }}>
              <Link href="/login" style={{ fontWeight: 900 }}>
                Go to login
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}