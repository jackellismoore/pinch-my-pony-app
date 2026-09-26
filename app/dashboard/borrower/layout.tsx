"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardShell from "@/components/DashboardShell";

export default function BorrowerDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkAccess() {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        if (!cancelled) router.replace("/");
        return;
      }
      if (cancelled) return;
      setAuthorized(true);
      setLoading(false);
    }
    checkAccess();
    return () => { cancelled = true; };
  }, [router]);

  if (loading) return <div style={{padding:40,textAlign:"center",fontSize:14,color:"rgba(0,0,0,0.6)"}}>Loading dashboard…</div>;
  if (!authorized) return null;

  return <DashboardShell><main style={{minWidth:0}}>{children}</main></DashboardShell>;
}
