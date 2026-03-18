"use client";

import { usePathname } from "next/navigation";
import AuthGate from "./AuthGate";

const PUBLIC_PREFIXES = [
  "/",
  "/browse",
  "/horse/",
  "/faq",
  "/contact",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;

  return PUBLIC_PREFIXES.some((prefix) => {
    if (prefix === "/") return false;
    return pathname === prefix || pathname.startsWith(prefix);
  });
}

export default function LayoutGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  return <AuthGate>{children}</AuthGate>;
}