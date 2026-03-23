"use client";

import { useEffect, useRef } from "react";
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
  const runningRef = useRef(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function hardRedirect(path: string) {
      if (redirectedRef.current || cancelled) return;
      redirectedRef.current = true;
      window.location.replace(path);
    }

    async function routeUser(userId: string) {
      if (runningRef.current || redirectedRef.current || cancelled) return;
      runningRef.current = true;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, role, verification_status")
          .eq("id", userId)
          .maybeSingle();

        if (cancelled || redirectedRef.current) return;

        const profile = !error ? (data as ProfileGate | null) : null;
        const role = profile?.role ?? null;
        const status = profile?.verification_status ?? "unverified";

        if (mode === "signup") {
          hardRedirect("/verify");
          return;
        }

        if (status !== "verified") {
          hardRedirect("/verify");
          return;
        }

        hardRedirect(role === "owner" ? "/dashboard/owner" : "/dashboard/borrower");
      } finally {
        runningRef.current = false;
      }
    }

    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user || cancelled || redirectedRef.current) return;
      await routeUser(user.id);
    }

    checkExistingSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;
      if (!user || cancelled || redirectedRef.current) return;
      await routeUser(user.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [mode]);

  return null;
}