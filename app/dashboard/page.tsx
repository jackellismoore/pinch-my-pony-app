"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardRouter() {
  const router = useRouter();

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (data?.role === "owner") {
      router.push("/dashboard/owner");
    } else if (data?.role === "borrower") {
      router.push("/dashboard/borrower");
    } else {
      router.push("/");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <p>Loading dashboard...</p>
    </div>
  );
}
