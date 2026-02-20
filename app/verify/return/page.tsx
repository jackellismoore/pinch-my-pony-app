"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function VerifyReturnPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Checking your verification status…");

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    async function tick() {
      tries += 1;

      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;

      if (!uid) {
        setMsg("You’re not signed in. Redirecting to login…");
        router.replace("/login");
        return;
      }

      const { data: p } = await supabase.from("profiles").select("role, verification_status").eq("id", uid).maybeSingle();
      const status = (p as any)?.verification_status ?? "unverified";

      if (cancelled) return;

      if (status === "verified") {
        const role = (p as any)?.role;
        const dash = role === "owner" ? "/dashboard/owner" : "/dashboard/borrower";
        setMsg("Verified ✅ Redirecting…");
        router.replace(dash);
        return;
      }

      if (status === "failed") {
        setMsg("We need one more step. Redirecting…");
        router.replace("/verify");
        return;
      }

      // Keep polling for a short period; webhooks can be near-instant but not guaranteed
      if (tries < 30) {
        setTimeout(tick, 1500);
      } else {
        setMsg("Still processing… If this takes too long, return to the verification page.");
      }
    }

    tick();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ fontWeight: 950, opacity: 0.8 }}>{msg}</div>
    </div>
  );
}