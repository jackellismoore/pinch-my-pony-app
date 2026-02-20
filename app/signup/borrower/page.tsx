"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

function sanitizeRedirectTo(v: string | null): string {
  if (!v) return "/browse";
  if (!v.startsWith("/")) return "/browse";
  if (v.startsWith("//")) return "/browse";
  if (v === "/login" || v === "/signup") return "/browse";
  return v;
}

export default function SignupRolePage() {
  const searchParams = useSearchParams();
  const redirectTo = sanitizeRedirectTo(searchParams.get("redirectTo"));

  const buildHref = (base: string) => `${base}?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Create an account</h1>
      <p style={{ marginTop: 10, opacity: 0.75, lineHeight: 1.6 }}>
        Are you here to borrow a horse — or list one as an owner?
      </p>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <Link href={buildHref("/signup/borrower")} style={card}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>I’m a Borrower</div>
          <div style={{ marginTop: 4, opacity: 0.75, fontSize: 13 }}>
            Browse horses, request dates, message owners, and leave reviews.
          </div>
        </Link>

        <Link href={buildHref("/signup/owner")} style={card}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>I’m an Owner</div>
          <div style={{ marginTop: 4, opacity: 0.75, fontSize: 13 }}>
            List your horse, approve requests, and manage availability.
          </div>
        </Link>

        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
          Already have an account?{" "}
          <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} style={{ fontWeight: 900 }}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  display: "block",
  padding: 16,
  borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.14)",
  textDecoration: "none",
  color: "black",
  background: "white",
};