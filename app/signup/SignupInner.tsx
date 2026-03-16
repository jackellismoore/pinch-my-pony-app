"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const palette = {
  forest: "#1F3D2B",
  cream: "#F5F1E8",
  navy: "#1F2A44",
};

export default function SignupInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const buildHref = (base: string) =>
    redirectTo ? `${base}?redirectTo=${encodeURIComponent(redirectTo)}` : base;

  return (
    <div style={wrap}>
      <div style={bg} aria-hidden="true" />

      <div style={container}>
        <div style={card}>
          <div style={eyebrow}>Choose your account type</div>

          <h1 style={title}>Create your Pinch My Pony account</h1>

          <p style={subtitle}>
            Choose how you’ll use the platform. You can either browse and request rides,
            or list your horse and manage rider requests.
          </p>

          <div style={optionGrid}>
            <Link href={buildHref("/signup/borrower")} style={optionCard}>
              <div style={iconBox}>🧑‍🌾</div>
              <div>
                <div style={optionTitle}>I want to borrow a horse</div>
                <div style={optionText}>
                  Browse listings, request rides, and message owners.
                </div>
              </div>
            </Link>

            <Link href={buildHref("/signup/owner")} style={optionCard}>
              <div style={iconBox}>🐎</div>
              <div>
                <div style={optionTitle}>I want to list my horse</div>
                <div style={optionText}>
                  Add horses, manage availability, and approve requests.
                </div>
              </div>
            </Link>
          </div>

          <div style={footerRow}>
            <span style={{ opacity: 0.72 }}>Already have an account?</span>
            <Link href={buildHref("/login")} style={loginLink}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: "relative",
  minHeight: "calc(100vh - 60px)",
  overflow: "hidden",
  background: palette.cream,
  padding: "22px 16px 34px",
};

const bg: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(900px 420px at 20% 0%, rgba(200,162,77,0.18), transparent 55%), radial-gradient(900px 420px at 90% 18%, rgba(31,61,43,0.14), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 68%)",
};

const container: React.CSSProperties = {
  position: "relative",
  maxWidth: 720,
  margin: "0 auto",
};

const card: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.88)",
  boxShadow: "0 22px 60px rgba(31,42,68,0.10)",
  padding: 20,
};

const eyebrow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.72)",
  fontSize: 12,
  fontWeight: 950,
  color: palette.navy,
};

const title: React.CSSProperties = {
  margin: "14px 0 0",
  fontSize: "clamp(30px, 6vw, 42px)",
  lineHeight: 1.04,
  letterSpacing: -0.5,
  color: palette.navy,
};

const subtitle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 16,
  lineHeight: 1.7,
  color: "rgba(15,23,42,0.75)",
};

const optionGrid: React.CSSProperties = {
  marginTop: 18,
  display: "grid",
  gap: 14,
};

const optionCard: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  padding: 18,
  borderRadius: 18,
  border: "1px solid rgba(31,42,68,0.12)",
  textDecoration: "none",
  background: "white",
  boxShadow: "0 14px 34px rgba(31,42,68,0.06)",
  color: palette.navy,
};

const iconBox: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 16,
  background: "rgba(31,61,43,0.08)",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  fontSize: 24,
};

const optionTitle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 17,
};

const optionText: React.CSSProperties = {
  marginTop: 4,
  fontSize: 14,
  lineHeight: 1.6,
  color: "rgba(15,23,42,0.7)",
};

const footerRow: React.CSSProperties = {
  marginTop: 16,
  display: "flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap",
  fontSize: 14,
};

const loginLink: React.CSSProperties = {
  color: palette.forest,
  fontWeight: 900,
  textDecoration: "none",
};