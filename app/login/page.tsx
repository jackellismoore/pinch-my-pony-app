"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import LoginInner from "./LoginInner";
import AuthPostAuthRedirect from "../components/AuthPostAuthRedirect";

function SessionRedirector() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;

      if (!cancelled && u) {
        router.replace("/");
        router.refresh();
      }
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (u) {
        router.replace("/");
        router.refresh();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

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
      <AuthPostAuthRedirect mode="login" />
      <LoginInner />
    </Suspense>
  );
}