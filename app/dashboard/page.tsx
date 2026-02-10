"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const routeByRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/signup");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        router.replace("/");
        return;
      }

      if (profile.role === "owner") {
        router.replace("/dashboard/owner");
      } else {
        router.replace("/dashboard/borrower");
      }
    };

    routeByRole();
  }, [router]);

  return <p style={{ padding: 24 }}>Loading dashboard…</p>;
}
