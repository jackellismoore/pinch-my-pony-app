"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useRef } from "react";
import LoginInner from "./LoginInner";
import { supabase } from "@/lib/supabaseClient";

type ProfileGate = {
  id: string;
  role: "owner" | "borrower" | null;
  verification_status: string | null;
};

function SessionRedirector() {
  const ranRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (ranRef.current) return;
      ranRef.current = true;

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const user = !userErr ? userRes.user : null;

      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, verification_status")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const profile = !error ? (data as ProfileGate | null) : null;
      const role = profile?.role ?? null;
      const status = profile?.verification_status ?? "unverified";

      if (status !== "verified") {
        window.location.replace("/verify");
        return;
      }

      window.location.replace(role === "owner" ? "/dashboard/owner" : "/dashboard/borrower");
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

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
      <LoginInner />
    </Suspense>
  );
}