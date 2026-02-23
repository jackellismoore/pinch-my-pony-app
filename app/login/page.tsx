"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import LoginInner from "./LoginInner";
import AuthPostAuthRedirect from "../components/AuthPostAuthRedirect";

/**
 * Hard redirect to home as soon as a valid Supabase session exists.
 * This prevents the "signed in but still stuck on /login" issue.
 */
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <SessionRedirector />

      {/* Keep your existing redirect logic intact */}
      <AuthPostAuthRedirect mode="login" />

      <LoginInner />
    </Suspense>
  );
}