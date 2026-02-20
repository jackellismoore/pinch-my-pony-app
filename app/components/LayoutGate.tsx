"use client";

import { usePathname } from "next/navigation";
import AuthGate from "./AuthGate";

export default function LayoutGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Allow verify flow to render even if AuthGate has issues determining readiness
  if (pathname === "/verify" || pathname.startsWith("/verify/")) {
    return <>{children}</>;
  }

  return <AuthGate>{children}</AuthGate>;
}