"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/signup/owner",
  "/signup/borrower",
  "/verify",
  "/contact",
  "/faq",
];

function isPublicPath(pathname: string | null) {
  if (!pathname) return true;

  // allow anything that starts with these
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function VerificationGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user ?? null;

        // ✅ allow public routes ALWAYS (signup fix)
        if (isPublicPath(pathname)) {
          if (!cancelled) setLoading(false);
          return;
        }

        // ❌ not logged in → go login
        if (!user) {
          router.replace("/login");
          return;
        }

        // check verification
        const { data: profile } = await supabase
          .from("profiles")
          .select("verification_status")
          .eq("id", user.id)
          .maybeSingle();

        const status = profile?.verification_status ?? "unverified";

        // ❌ not verified → force verify page
        if (status !== "verified") {
          router.replace("/verify");
          return;
        }

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (loading) return null;

  return <>{children}</>;
}