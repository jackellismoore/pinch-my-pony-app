"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthedUser = { id: string } | null;

export default function HomePage() {
  const [user, setUser] = useState<AuthedUser>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setUser((data.user ? { id: data.user.id } : null) as AuthedUser);
      } catch {
        if (mounted) setUser(null);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id } : null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const primaryCtaHref = "/browse";
  const secondaryCtaHref = user ? "/dashboard/owner" : "/signup";

  const heroSubcopy = useMemo(() => {
    return user
      ? "Welcome back — browse available horses, send a request, and ride with confidence."
      : "Pinch My Pony is a trusted horse-borrowing marketplace. Owners list horses, borrowers request dates, and everyone rides with clear rules and reviews.";
  }, [user]);

  return (
    <div style={fullBleedWrap}>
      {/* Page-local styles (no globals changes needed) */}
      <style>{css}</style>

      {/* HERO */}
      <section style={heroSection} aria-label="Pinch My Pony home">
        <div style={heroBg} aria-hidden="true" />

        <div style={container}>
          <div style={heroGrid}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={eyebrowPill}>
                <span aria-hidden="true">🐴</span>
                <span>Borrow • Share • Ride — with trust built in</span>
              </div>

              <h1 style={heroTitle}>
                The warm, modern way to{" "}
                <span style={heroAccent}>borrow</span> or{" "}
                <span style={heroAccent}>share</span> a horse.
              </h1>

              <p style={heroParagraph}>{heroSubcopy}</p>

              <div style={ctaRow}>
                <Link href={primaryCtaHref} style={{ textDecoration: "none" }}>
                  <span style={primaryButton}>Browse Horses</span>
                </Link>

                <Link href={secondaryCtaHref} style={{ textDecoration: "none" }}>
                  <span style={secondaryButton}>
                    List Your Horse
                    <span style={{ opacity: 0.7, fontWeight: 800, marginLeft: 8 }}>
                      {user ? "(Owner dashboard)" : "(Create account)"}
                    </span>
                  </span>
                </Link>

                {!user ? (
                  <div style={smallAuthRow}>
                    <Link href="/login" style={smallLink}>
                      Login
                    </Link>
                    <span style={{ opacity: 0.4 }}>•</span>
                    <Link href="/signup" style={smallLink}>
                      Sign Up
                    </Link>
                  </div>
                ) : null}
              </div>

              <div style={heroStatsRow}>
                <InfoChip title="Availability enforced" subtitle="Date conflicts blocked" />
                <InfoChip title="Messaging built-in" subtitle="Keep it all in one place" />
                <InfoChip title="Reviews & ratings" subtitle="Ride with confidence" />
              </div>
            </div>

            {/* Logo / Visual */}
            <div style={heroVisualCard} aria-label="Brand mark">
              <div style={heroVisualInner}>
                <div style={logoRow}>
                  <div style={logoBadge}>
                    {/* Save your uploaded image to: /public/pmp-logo.png */}
                    <Image
                      src="/pmp-logo.png"
                      alt="Pinch My Pony logo"
                      width={88}
                      height={88}
                      priority
                      style={{ width: 88, height: 88, objectFit: "contain" }}
                    />
                  </div>
                  <div style={{ lineHeight: 1.15 }}>
                    <div style={{ fontWeight: 950, fontSize: 20, color: palette.navy }}>
                      Pinch My Pony
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.7 }}>
                      Horse borrowing marketplace
                    </div>
                  </div>
                </div>

                <div style={divider} />

                <div style={{ display: "grid", gap: 10 }}>
                  <MiniCard
                    icon="🧭"
                    title="Find the right horse"
                    copy="Browse nearby listings, read profiles, and check details before you request."
                  />
                  <MiniCard
                    icon="📅"
                    title="Request specific dates"
                    copy="Send a date range request. Availability rules prevent conflicts."
                  />
                  <MiniCard
                    icon="🤝"
                    title="Ride, review, repeat"
                    copy="Owners approve trusted riders. Reviews help everyone feel secure."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={section}>
        <div style={container}>
          <header style={sectionHeader}>
            <h2 style={sectionTitle}>How it works</h2>
            <p style={sectionSubtitle}>
              Built for both borrowers and owners — clear steps, clear expectations.
            </p>
          </header>

          <div style={twoColumn}>
            <div style={card}>
              <div style={cardTopRow}>
                <span style={rolePillBorrower}>For Borrowers</span>
                <span style={mutedPill}>3 steps</span>
              </div>

              <ol style={stepList}>
                <Step
                  number="1"
                  title="Browse active horses"
                  copy="Explore listings, check details, and get a feel for each horse and owner."
                />
                <Step
                  number="2"
                  title="Request your dates"
                  copy="Pick a date range and send a request. If dates overlap, conflicts are blocked."
                />
                <Step
                  number="3"
                  title="Ride & review"
                  copy="Coordinate via built-in messaging, then leave a review to help the community."
                />
              </ol>

              <div style={cardCtas}>
                <Link href="/browse" style={{ textDecoration: "none" }}>
                  <span style={primaryButtonSmall}>Start browsing</span>
                </Link>
                {!user ? (
                  <Link href="/signup" style={{ textDecoration: "none" }}>
                    <span style={secondaryButtonSmall}>Create an account</span>
                  </Link>
                ) : (
                  <Link href="/dashboard/borrower" style={{ textDecoration: "none" }}>
                    <span style={secondaryButtonSmall}>Go to borrower dashboard</span>
                  </Link>
                )}
              </div>
            </div>

            <div style={card}>
              <div style={cardTopRow}>
                <span style={rolePillOwner}>For Owners</span>
                <span style={mutedPill}>3 steps</span>
              </div>

              <ol style={stepList}>
                <Step
                  number="1"
                  title="List your horse"
                  copy="Create a listing with details and set expectations for borrowers."
                />
                <Step
                  number="2"
                  title="Approve trusted riders"
                  copy="Review requests, chat with borrowers, and approve or decline."
                />
                <Step
                  number="3"
                  title="Manage availability"
                  copy="Block off dates and avoid conflicts automatically with availability enforcement."
                />
              </ol>

              <div style={cardCtas}>
                <Link href={secondaryCtaHref} style={{ textDecoration: "none" }}>
                  <span style={primaryButtonSmall}>List a horse</span>
                </Link>
                <Link href="/messages" style={{ textDecoration: "none" }}>
                  <span style={secondaryButtonSmall}>Open messages</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / SAFETY */}
      <section style={sectionAlt}>
        <div style={container}>
          <header style={sectionHeader}>
            <h2 style={sectionTitle}>Trust & safety, baked in</h2>
            <p style={sectionSubtitle}>
              Feel confident — with profiles, messaging, and guardrails that keep things clear.
            </p>
          </header>

          <div style={featureGrid}>
            <FeatureCard
              icon="⭐"
              title="Reviews & ratings"
              copy="Transparent feedback helps owners and borrowers build trust over time."
            />
            <FeatureCard
              icon="🗓️"
              title="Date conflict enforcement"
              copy="Availability blocks prevent overlapping requests so schedules stay reliable."
            />
            <FeatureCard
              icon="💬"
              title="Built-in messaging"
              copy="Coordinate details without switching apps — keep everything in one place."
            />
            <FeatureCard
              icon="🪪"
              title="Profiles that matter"
              copy="See who you’re riding with (or hosting) before you confirm a request."
            />
          </div>

          <div style={trustCtaBand}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 18, color: palette.navy }}>
                Ready to ride — or ready to share?
              </div>
              <div style={{ opacity: 0.75, marginTop: 4 }}>
                Choose your path and get started in minutes.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Link href="/browse" style={{ textDecoration: "none" }}>
                <span style={primaryButtonSmall}>Browse horses</span>
              </Link>
              <Link href={secondaryCtaHref} style={{ textDecoration: "none" }}>
                <span style={secondaryButtonSmall}>List your horse</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={finalSection}>
        <div style={container}>
          <div style={finalCard}>
            <div style={{ display: "grid", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 26, color: palette.navy, letterSpacing: -0.2 }}>
                A marketplace that feels human.
              </h2>
              <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.65 }}>
                Warm design. Clear steps. Real guardrails. Pinch My Pony helps riders and owners connect with confidence.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Link href="/browse" style={{ textDecoration: "none" }}>
                <span style={primaryButton}>Browse Horses</span>
              </Link>
              <Link href={secondaryCtaHref} style={{ textDecoration: "none" }}>
                <span style={secondaryButton}>List Your Horse</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom padding so it breathes */}
      <div style={{ height: 26 }} />
    </div>
  );
}

/* -------------------------
   Small presentational pieces
-------------------------- */

function InfoChip({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={infoChip}>
      <div style={{ fontWeight: 950, fontSize: 13, color: palette.navy }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{subtitle}</div>
    </div>
  );
}

function MiniCard({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return (
    <div style={miniCard}>
      <div style={miniIcon} aria-hidden="true">
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 950, color: palette.navy }}>{title}</div>
        <div style={{ opacity: 0.75, fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{copy}</div>
      </div>
    </div>
  );
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <li style={stepItem}>
      <div style={stepNumber} aria-hidden="true">
        {number}
      </div>
      <div>
        <div style={{ fontWeight: 950, color: palette.navy }}>{title}</div>
        <div style={{ opacity: 0.8, marginTop: 4, lineHeight: 1.6 }}>{copy}</div>
      </div>
    </li>
  );
}

function FeatureCard({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return (
    <div style={featureCard}>
      <div style={featureIcon} aria-hidden="true">
        {icon}
      </div>
      <div style={{ fontWeight: 950, color: palette.navy }}>{title}</div>
      <div style={{ opacity: 0.78, marginTop: 6, lineHeight: 1.6 }}>{copy}</div>
    </div>
  );
}

/* -------------------------
   Styling (inline + tiny CSS)
-------------------------- */

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

const css = `
  /* Improve tap highlights and text rendering */
  :root { -webkit-tap-highlight-color: transparent; }
`;

const fullBleedWrap: React.CSSProperties = {
  width: "100vw",
  marginLeft: "calc(50% - 50vw)", // break out of main max-width: 900px safely
};

const container: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "0 16px",
};

const heroSection: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  padding: "44px 0 28px",
  background: palette.cream,
};

const heroBg: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(900px 420px at 20% 10%, rgba(200,162,77,0.22), transparent 55%), radial-gradient(900px 420px at 90% 30%, rgba(31,61,43,0.18), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 65%)",
};

const heroGrid: React.CSSProperties = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "1.05fr 0.95fr",
  gap: 18,
  alignItems: "stretch",
};

const eyebrowPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(31,61,43,0.08)",
  border: "1px solid rgba(31,61,43,0.12)",
  color: palette.forest,
  fontWeight: 900,
  fontSize: 13,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 44,
  lineHeight: 1.06,
  letterSpacing: -0.6,
  color: palette.navy,
};

const heroAccent: React.CSSProperties = {
  color: palette.forest,
  textDecoration: "underline",
  textDecorationThickness: "6px",
  textUnderlineOffset: "6px",
  textDecorationColor: "rgba(200,162,77,0.45)",
};

const heroParagraph: React.CSSProperties = {
  margin: 0,
  fontSize: 16.5,
  lineHeight: 1.75,
  opacity: 0.9,
  maxWidth: 640,
};

const ctaRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: 6,
};

const smallAuthRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  marginLeft: 6,
  fontWeight: 800,
};

const smallLink: React.CSSProperties = {
  textDecoration: "none",
  color: palette.navy,
  opacity: 0.85,
};

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 16px",
  borderRadius: 14,
  background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
  color: "white",
  fontWeight: 950,
  border: "1px solid rgba(0,0,0,0.10)",
  boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
};

const secondaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 16px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.75)",
  color: palette.navy,
  fontWeight: 950,
  border: "1px solid rgba(31,42,68,0.18)",
  boxShadow: "0 14px 34px rgba(31,42,68,0.08)",
};

const primaryButtonSmall: React.CSSProperties = {
  ...primaryButton,
  padding: "10px 14px",
  borderRadius: 12,
  boxShadow: "0 10px 26px rgba(31,61,43,0.16)",
};

const secondaryButtonSmall: React.CSSProperties = {
  ...secondaryButton,
  padding: "10px 14px",
  borderRadius: 12,
};

const heroStatsRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  marginTop: 14,
};

const infoChip: React.CSSProperties = {
  padding: "12px 12px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(31,42,68,0.10)",
  boxShadow: "0 12px 30px rgba(31,42,68,0.06)",
};

const heroVisualCard: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(245,241,232,0.65) 100%)",
  boxShadow: "0 22px 60px rgba(31,42,68,0.12)",
  overflow: "hidden",
  minHeight: 360,
};

const heroVisualInner: React.CSSProperties = {
  padding: 18,
  display: "grid",
  gap: 12,
};

const logoRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const logoBadge: React.CSSProperties = {
  width: 92,
  height: 92,
  borderRadius: 20,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(31,42,68,0.12)",
  boxShadow: "0 14px 36px rgba(31,42,68,0.10)",
  display: "grid",
  placeItems: "center",
};

const divider: React.CSSProperties = {
  height: 1,
  background: "rgba(31,42,68,0.10)",
  margin: "4px 0",
};

const miniCard: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px 1fr",
  gap: 10,
  padding: "12px 12px",
  borderRadius: 18,
  border: "1px solid rgba(31,42,68,0.10)",
  background: "rgba(255,255,255,0.70)",
};

const miniIcon: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  background: "rgba(200,162,77,0.20)",
  border: "1px solid rgba(200,162,77,0.28)",
  display: "grid",
  placeItems: "center",
  fontSize: 18,
};

const section: React.CSSProperties = {
  padding: "40px 0",
  background: "#fafafa",
};

const sectionAlt: React.CSSProperties = {
  padding: "40px 0",
  background: `linear-gradient(180deg, #fafafa 0%, rgba(245,241,232,0.7) 100%)`,
};

const sectionHeader: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  letterSpacing: -0.3,
  color: palette.navy,
};

const sectionSubtitle: React.CSSProperties = {
  margin: 0,
  opacity: 0.78,
  lineHeight: 1.65,
  maxWidth: 780,
};

const twoColumn: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const card: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "white",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
  padding: 18,
  display: "grid",
  gap: 14,
};

const cardTopRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const mutedPill: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(31,42,68,0.14)",
  background: "rgba(31,42,68,0.04)",
  color: palette.navy,
  opacity: 0.85,
};

const rolePillBorrower: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(31,61,43,0.18)",
  background: "rgba(31,61,43,0.08)",
  color: palette.forest,
};

const rolePillOwner: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(139,94,60,0.22)",
  background: "rgba(139,94,60,0.10)",
  color: palette.saddle,
};

const stepList: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 12,
};

const stepItem: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "38px 1fr",
  gap: 12,
  alignItems: "start",
};

const stepNumber: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 14,
  background: "rgba(200,162,77,0.22)",
  border: "1px solid rgba(200,162,77,0.28)",
  display: "grid",
  placeItems: "center",
  fontWeight: 950,
  color: palette.navy,
};

const cardCtas: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const featureGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
  marginTop: 10,
};

const featureCard: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.82)",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
  padding: 16,
};

const featureIcon: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 16,
  background: "rgba(31,61,43,0.10)",
  border: "1px solid rgba(31,61,43,0.14)",
  display: "grid",
  placeItems: "center",
  fontSize: 18,
  marginBottom: 10,
};

const trustCtaBand: React.CSSProperties = {
  marginTop: 16,
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background:
    "linear-gradient(90deg, rgba(31,61,43,0.08) 0%, rgba(200,162,77,0.10) 55%, rgba(31,42,68,0.07) 100%)",
  padding: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const finalSection: React.CSSProperties = {
  padding: "34px 0 10px",
  background: "#fafafa",
};

const finalCard: React.CSSProperties = {
  borderRadius: 26,
  border: "1px solid rgba(31,42,68,0.12)",
  background:
    "radial-gradient(900px 420px at 15% 0%, rgba(200,162,77,0.18), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,241,232,0.62) 100%)",
  boxShadow: "0 22px 60px rgba(31,42,68,0.12)",
  padding: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
};

/* Responsive tweaks (purely via inline-friendly approach):
   We can’t use media queries in inline styles, so we use a small trick:
   Keep the layout decent even when columns wrap naturally.
*/
const responsiveHints: React.CSSProperties = {};

/* -------------------------
   Tiny runtime-safe layout handling (optional)
   The layout still looks fine without this, but you can keep it simple.
-------------------------- */
// NOTE: If you want, I can add a minimal "useWindowWidth" hook to switch to 1-col at < 900px.
// For now, the grids are okay; the main one is the only 2-col. If you see it feel tight,
// tell me your target breakpoint and I’ll add it (still no deps).