"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileGate = {
  id: string;
  role: "owner" | "borrower" | null;
  verification_status: string | null;
};

export default function AuthPostAuthRedirect({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const router = useRouter();
  const runningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function routeUser(userId: string) {
      // prevent double runs from auth events
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const { data: p, error } = await supabase
          .from("profiles")
          .select("id, role, verification_status")
          .eq("id", userId)
          .maybeSingle();

        const role = (!error && (p as ProfileGate | null)?.role) || null;
        const status = (!error && (p as ProfileGate | null)?.verification_status) || "unverified";

        // Always send unverified users to verify
        if (status !== "verified") {
          router.replace("/verify");
          return;
        }

        // Verified users go to dashboard
        const dash = role === "owner" ? "/dashboard/owner" : "/dashboard/borrower";
        router.replace(dash);
      } finally {
        // allow re-run if needed
        runningRef.current = false;
      }
    }

    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      if (!u) return;
      if (cancelled) return;
      await routeUser(u.id);
    }

    checkExistingSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user;
      if (!u) return;

      // For signup pages, we *always* want to go to /verify after a new account is created
      // even if they verified earlier (rare), but if already verified, they'll pass through quickly.
      await routeUser(u.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, mode]);

  return null;
}