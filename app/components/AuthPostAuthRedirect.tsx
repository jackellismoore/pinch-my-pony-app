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
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      window.location.replace(path);
    }

    async function routeUser(userId: string) {
      if (runningRef.current || redirectedRef.current) return;
      runningRef.current = true;

      try {
        const { data: p, error } = await supabase
          .from("profiles")
          .select("id, role, verification_status")
          .eq("id", userId)
          .maybeSingle();

        if (cancelled || redirectedRef.current) return;

        const profile = !error ? (p as ProfileGate | null) : null;
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

        const target = role === "owner" ? "/dashboard/owner" : "/dashboard/borrower";
        hardRedirect(target);
      } finally {
        runningRef.current = false;
      }
    }

    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      if (!u || cancelled || redirectedRef.current) return;
      await routeUser(u.id);
    }

    checkExistingSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user;
      if (!u || cancelled || redirectedRef.current) return;
      await routeUser(u.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [mode]);

  return null;
}