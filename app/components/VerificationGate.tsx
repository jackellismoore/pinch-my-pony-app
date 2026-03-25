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

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/verify",
  "/contact",
  "/faq",
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;

  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/api")) return true;

  return false;
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

  const isPublic = useMemo(() => isPublicPath(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (isPublic) {
        if (!cancelled) {
          setAllowed(true);
          setChecking(false);
        }
        return;
      }

      try {
        setChecking(true);

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;
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

        const status = ((profile as any)?.verification_status ?? "unverified") as VerificationStatus;
        const verified = String(status).toLowerCase() === "verified";

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
          setAllowed(false);
          setChecking(false);
          router.replace("/verify");
        }
      }
    }

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      run();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [isPublic, pathname, router]);

  if (checking) {
    return (
      <>
        <style>{`
          .pmp-gateShell {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background:
              radial-gradient(900px 320px at 10% 0%, rgba(200,162,77,0.12), transparent 55%),
              radial-gradient(900px 320px at 90% 0%, rgba(31,61,43,0.08), transparent 55%),
              linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,241,232,0.92));
          }

          .pmp-gateCard {
            width: 100%;
            max-width: 520px;
            border-radius: 24px;
            border: 1px solid rgba(15,23,42,0.08);
            background: rgba(255,255,255,0.88);
            box-shadow: 0 24px 60px rgba(15,23,42,0.10);
            padding: 24px;
            text-align: center;
          }

          .pmp-gateBadge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(31,61,43,0.08);
            border: 1px solid rgba(31,61,43,0.14);
            color: #1f3d2b;
            font-weight: 950;
            font-size: 13px;
          }

          .pmp-gateTitle {
            margin: 14px 0 8px;
            font-size: 28px;
            line-height: 1.1;
            font-weight: 950;
            color: #1f2a44;
          }

          .pmp-gateText {
            margin: 0;
            color: rgba(15,23,42,0.75);
            line-height: 1.65;
            font-weight: 600;
          }
        `}</style>

        <div className="pmp-gateShell">
          <div className="pmp-gateCard">
            <div className="pmp-gateBadge">🔒 Verification required</div>
            <div className="pmp-gateTitle">Checking your access…</div>
            <p className="pmp-gateText">
              We’re confirming your account status before opening the marketplace.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}