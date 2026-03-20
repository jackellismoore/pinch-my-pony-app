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
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const { data: p, error } = await supabase
          .from("profiles")
          .select("id, role, verification_status")
          .eq("id", userId)
          .maybeSingle();

        if (cancelled) return;

        const profile = !error ? (p as ProfileGate | null) : null;
        const role = profile?.role ?? null;
        const status = profile?.verification_status ?? "unverified";

        if (mode === "signup") {
          router.replace("/verify");
          return;
        }

        if (status !== "verified") {
          router.replace("/verify");
          return;
        }

        const dash = role === "owner" ? "/dashboard/owner" : "/dashboard/borrower";
        router.replace(dash);
      } finally {
        runningRef.current = false;
      }
    }

    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      if (!u || cancelled) return;
      await routeUser(u.id);
    }

    checkExistingSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user;
      if (!u || cancelled) return;
      await routeUser(u.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, mode]);

  return null;
}