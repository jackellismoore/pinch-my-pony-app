"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PUBLIC_ROUTES = new Set([
  "/", // ✅ public marketing homepage
  "/login",
  "/signup",
  "/signup/borrower",
  "/signup/owner",
]);

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.has(pathname);
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const loginHref = useMemo(() => {
    const current =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : pathname;

    const redirectTo = current ? `?redirectTo=${encodeURIComponent(current)}` : "";
    return `/login${redirectTo}`;
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    async function check() {
      if (isPublic(pathname)) {
        if (mounted) setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        router.replace(loginHref);
        return;
      }

      if (mounted) setReady(true);
    }

    setReady(false);
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

  // Only show loading state for protected pages
  if (!ready && !isPublic(pathname)) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ fontWeight: 900, opacity: 0.7 }}>Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}