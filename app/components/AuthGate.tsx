"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PUBLIC_ROUTES = new Set([
  "/", // public marketing homepage
  "/login",
  "/signup",
  "/signup/borrower",
  "/signup/owner",
]);

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.has(pathname);
}

// Signed-in but not verified can still access these:
function isVerificationAllowed(pathname: string) {
  return (
    pathname === "/verify" ||
    pathname === "/verify/return" ||
    pathname.startsWith("/verify/") ||
    pathname === "/profile" // optional; remove if you want profile locked too
  );
}

type ProfileGate = {
  id: string;
  verification_status: string | null;
};

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
      // Public pages never gated
      if (isPublic(pathname)) {
        if (mounted) setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      // Must be signed in
      if (!session?.user) {
        router.replace(loginHref);
        return;
      }

      // If on verification-related routes, allow even if not verified
      if (isVerificationAllowed(pathname)) {
        if (mounted) setReady(true);
        return;
      }

      // Check verification status from profiles
      const { data: p, error } = await supabase
        .from("profiles")
        .select("id, verification_status")
        .eq("id", session.user.id)
        .maybeSingle();

      // If schema isn't migrated yet, fail closed (send to /verify)
      const status = (!error && (p as ProfileGate | null)?.verification_status) || "unverified";

      if (status !== "verified") {
        router.replace("/verify");
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
      // Re-run checks on auth changes to enforce verification gating
      setReady(false);
      check();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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