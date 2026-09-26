"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  cream: "#F5F1E8",
  navy: "#1F2A44",
};

export default function OwnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        if (!cancelled) router.replace("/");
        return;
      }

      if (cancelled) return;

      setAuthorized(true);
      setLoading(false);
    }

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontSize: 14, color: "rgba(0,0,0,0.6)" }}>
        Loading dashboard…
      </div>
    );
  }

  if (!authorized) return null;

  const pageBg = `radial-gradient(900px 420px at 20% 0%, rgba(200,162,77,0.18), transparent 55%),
                  radial-gradient(900px 420px at 90% 18%, rgba(31,61,43,0.14), transparent 58%),
                  linear-gradient(180deg, ${palette.cream} 0%, rgba(250,250,250,1) 68%)`;

  return (
    <div style={{ minHeight: "100vh", background: pageBg }}>
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "18px 16px 28px",
          minHeight: "calc(100vh - 36px)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
