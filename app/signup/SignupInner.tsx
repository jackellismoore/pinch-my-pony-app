"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SignupInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const buildHref = (base: string) =>
    redirectTo
      ? `${base}?redirectTo=${encodeURIComponent(redirectTo)}`
      : base;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Create an account</h1>

      <p style={{ marginTop: 10, opacity: 0.75 }}>
        Choose how you’ll use Pinch My Pony.
      </p>

      <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
        <Link
          href={buildHref("/signup/borrower")}
          style={{
            display: "block",
            padding: 18,
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.14)",
            textDecoration: "none",
            fontWeight: 900,
            color: "black",
            background: "white",
          }}
        >
          I want to borrow a horse
        </Link>

        <Link
          href={buildHref("/signup/owner")}
          style={{
            display: "block",
            padding: 18,
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.14)",
            textDecoration: "none",
            fontWeight: 900,
            color: "black",
            background: "white",
          }}
        >
          I want to list my horse
        </Link>
      </div>
    </div>
  );
}