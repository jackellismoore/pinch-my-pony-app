"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoginInner from "./LoginInner";
import { supabase } from "@/lib/supabaseClient";

type ProfileGate = {
  id: string;
  role: "owner" | "borrower" | null;
  verification_status: string | null;
};

function ConfirmedBanner() {
  const searchParams = useSearchParams();
  const confirmed = searchParams.get("confirmed") === "1";

  if (!confirmed) return null;

  return (
    <div className="pmp-pageShell" style={{ paddingBottom: 0 }}>
      <div
        className="pmp-sectionCard"
        style={{
          marginBottom: 12,
          border: "1px solid rgba(31,61,43,0.16)",
          background: "rgba(31,61,43,0.08)",
          color: "#1F2A44",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 4 }}>Email confirmed</div>
        <div className="pmp-mutedText">
          Your email has been confirmed. Please sign in to continue.
        </div>
      </div>
    </div>
  );
}

function SessionRedirector() {
  const ranRef = useRef(false);
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  const hasConfirmedParam = useMemo(
    () => searchParams.get("confirmed") === "1",
    [searchParams]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (ranRef.current) return;
      ranRef.current = true;

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
          console.error("Login SessionRedirector getUser error:", userErr);
        }

        if (!user || cancelled) {
          if (!cancelled) setReady(true);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, role, verification_status")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        const profile = !error ? (data as ProfileGate | null) : null;
        const role = profile?.role ?? null;
        const status = String(profile?.verification_status ?? "unverified").toLowerCase();

        if (status !== "verified") {
          window.location.replace("/verify");
          return;
        }

        window.location.replace(
          role === "owner" ? "/dashboard/owner" : "/dashboard/borrower"
        );
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    if (!hasConfirmedParam) {
      void run();
    } else {
      setReady(true);
    }

    return () => {
      cancelled = true;
    };
  }, [hasConfirmedParam]);

  if (!ready && !hasConfirmedParam) {
    return <LoadingFallback />;
  }

  return null;
}

function LoadingFallback() {
  return (
    <div className="pmp-pageShell">
      <div className="pmp-sectionCard" style={{ textAlign: "center" }}>
        <div className="pmp-mutedText">Loading sign in…</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SessionRedirector />
      <ConfirmedBanner />
      <LoginInner />
    </Suspense>
  );
}