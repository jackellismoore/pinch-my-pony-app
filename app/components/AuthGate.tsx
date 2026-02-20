"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PUBLIC_ROUTES = new Set([
  "/login",
  "/signup",
  "/signup/borrower",
  "/signup/owner",
  // If you add email-confirm/callback pages later, add them here.
]);

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.has(pathname);
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);

  const loginHref = useMemo(() => {
    const to = pathname ? `?redirectTo=${encodeURIComponent(pathname)}` : "";
    return `/login${to}`;
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    async function check() {
      if (isPublic(pathname)) {
        if (mounted) setReady(true);
        return;
      }

      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.replace(loginHref);
          return;
        }
        if (mounted) setReady(true);
      } catch {
        router.replace(loginHref);
      }
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isPublic(pathname) && !session?.user) {
        router.replace(loginHref);
        return;
      }
      if (session?.user && mounted) setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router, loginHref]);

  if (!ready && !isPublic(pathname)) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ fontWeight: 900, opacity: 0.7 }}>Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}