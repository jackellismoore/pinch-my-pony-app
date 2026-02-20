"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PUBLIC_ROUTES = new Set([
  "/login",
  "/signup",
  // add any other public routes here if you have them later
  // "/auth/callback",
]);

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      // Public pages are always accessible
      if (PUBLIC_ROUTES.has(pathname)) {
        if (mounted) setReady(true);
        return;
      }

      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (!user) {
          // Redirect unauthenticated users to login
          const redirectTo = pathname ? `?redirectTo=${encodeURIComponent(pathname)}` : "";
          router.replace(`/login${redirectTo}`);
          return;
        }

        if (mounted) setReady(true);
      } catch {
        const redirectTo = pathname ? `?redirectTo=${encodeURIComponent(pathname)}` : "";
        router.replace(`/login${redirectTo}`);
      }
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // If user logs out while on a protected page, push them to login
      if (!PUBLIC_ROUTES.has(pathname) && !session?.user) {
        const redirectTo = pathname ? `?redirectTo=${encodeURIComponent(pathname)}` : "";
        router.replace(`/login${redirectTo}`);
      }
      if (session?.user && mounted) setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  // While we check auth, don't flash protected content
  if (!ready && !PUBLIC_ROUTES.has(pathname)) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ fontWeight: 900, opacity: 0.7 }}>Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}