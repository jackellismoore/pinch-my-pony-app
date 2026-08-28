"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PUBLIC_PATH_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/confirm",
  "/verify",
  "/verify/return",
  "/contact",
  "/help",
  "/faq",
  "/safety",
  "/terms",
  "/privacy",
  "/report",
  "/browse",
  "/horse",
  "/owner",
  "/dashboard/membership",
];

function isPublicPath(pathname: string) {
  if (!pathname) return true;

  if (pathname === "/") return true;

  return PUBLIC_PATH_PREFIXES.some((prefix) => {
    if (prefix === "/") return false;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export default function VerificationGate({
  children,
}: {
  children: React.ReactNode;
  identityEnabled: boolean;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const publicRoute = useMemo(() => isPublicPath(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function checkInitialSession() {
      try {
        if (publicRoute) {
          if (!cancelled) {
            setAllowed(true);
            setChecking(false);
          }
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const user = session?.user ?? null;

        if (!user) {
          if (!cancelled) {
            setAllowed(false);
            setChecking(false);
            router.replace("/login");
          }
          return;
        }

        if (!cancelled) {
          setAllowed(true);
          setChecking(false);
        }
      } catch (err) {
        console.error("VerificationGate error:", err);

        if (!cancelled) {
          if (publicRoute) {
            setAllowed(true);
            setChecking(false);
          } else {
            setAllowed(false);
            setChecking(false);
            router.replace("/login");
          }
        }
      }
    }

    void checkInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || publicRoute) return;

      // Supabase invokes this callback while it owns the auth lock. Calling
      // getSession() from inside it can wait on the same lock after an iOS
      // foreground refresh, leaving the gate blank indefinitely.
      if (session?.user) {
        setAllowed(true);
        setChecking(false);
        return;
      }

      setAllowed(false);
      setChecking(false);
      router.replace("/login");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [publicRoute, router, pathname]);

  if (checking) {
    return null;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
