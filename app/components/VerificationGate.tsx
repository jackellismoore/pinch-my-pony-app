"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type VerificationStatus =
  | "verified"
  | "processing"
  | "failed"
  | "unverified"
  | string
  | null;

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
  "/faq",
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
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const publicRoute = useMemo(() => isPublicPath(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (publicRoute) {
          if (!cancelled) {
            setAllowed(true);
            setChecking(false);
          }
          return;
        }

        if (!cancelled) {
          setChecking(true);
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

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("verification_status")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const status = String(
          ((profile as { verification_status?: VerificationStatus } | null)
            ?.verification_status ?? "unverified")
        ).toLowerCase();

        const verified = status === "verified";

        if (!verified) {
          if (!cancelled) {
            setAllowed(false);
            setChecking(false);
            router.replace("/verify");
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

    void run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void run();
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