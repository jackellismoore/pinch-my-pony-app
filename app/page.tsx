"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileMini = {
  id: string;
  role: "owner" | "borrower" | null;
  display_name: string | null;
  full_name: string | null;
};

type Stats = {
  activeHorses: number;
  myPendingRequests: number;
  unreadMessages: number;
};

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

function pickName(p: ProfileMini | null) {
  const dn = (p?.display_name ?? "").trim();
  const fn = (p?.full_name ?? "").trim();
  return dn || fn || "there";
}

export default function HomePage() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [stats, setStats] = useState<Stats>({
    activeHorses: 0,
    myPendingRequests: 0,
    unreadMessages: 0,
  });

  // ✅ Always use getSession for fast, reliable "am I signed in?"
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;

      if (cancelled) return;

      setSessionUserId(u?.id ?? null);

      if (u?.id) {
        // Load profile (role/name)
        const { data: p } = await supabase
          .from("profiles")
          .select("id,role,display_name,full_name")
          .eq("id", u.id)
          .maybeSingle();

        if (!cancelled) setProfile((p ?? null) as ProfileMini | null);

        // Live stats (safe if tables/columns match your schema)
        try {
          const [{ count: activeHorses }, { count: myPendingRequests }] = await Promise.all([
            supabase.from("horses").select("*", { count: "exact", head: true }).eq("is_active", true),
            supabase
              .from("requests")
              .select("*", { count: "exact", head: true })
              .eq("status", "pending")
              .eq("borrower_id", u.id),
          ]);

          if (!cancelled) {
            setStats({
              activeHorses: activeHorses ?? 0,
              myPendingRequests: myPendingRequests ?? 0,
              unreadMessages: 0, // wire later if you track unread
            });
          }
        } catch {
          // non-fatal
        }
      } else {
        setProfile(null);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      const u = sess?.user ?? null;
      setSessionUserId(u?.id ?? null);

      // If they log out while on homepage, reset hub data
      if (!u) {
        setProfile(null);
        setStats({ activeHorses: 0, myPendingRequests: 0, unreadMessages: 0 });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAuthed = !!sessionUserId;
  const isOwner = profile?.role === "owner";
  const dashboardHref = isOwner ? "/dashboard/owner" : "/dashboard/borrower";

  const welcomeLine = useMemo(() => {
    return `Welcome back, ${pickName(profile)}.`;
  }, [profile]);

  return (
    <div style={fullBleedWrap}>
      <style>{css}</style>

      {/* HERO */}
      <section style={heroSection} aria-label="Pinch My Pony home">
        <div style={heroBg} aria-hidden="true" />

        <div style={container}>
          <div style={heroGrid}>
            {/* LEFT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={eyebrowPill}>
                <span aria-hidden="true">🐴</span>
                <span>{isAuthed ? "Signed in • Your account is ready" : "Borrow • Share • Ride — with trust built in"}</span>
              </div>

              <h1 style={heroTitle}>
                {isAuthed ? (
                  <>
                    {welcomeLine} <span style={heroAccent}>Let’s ride.</span>
                  </>
                ) : (
                  <>
                    The warm, modern way to <span style={heroAccent}>borrow</span> or{" "}
                    <span style={heroAccent}>share</span> a horse.
                  </>
                )}
              </h1>

              <p style={heroParagraph}>
                {isAuthed
                  ? "Manage requests, browse horses, and connect with confidence — everything stays organized in one place."
                  : "Pinch My Pony is a trusted horse-borrowing marketplace. Owners list horses, borrowers request dates, and everyone rides with clear rules and reviews."}
              </p>

              {/* CTA ROW */}
              {isAuthed ? (
                <>
                  <div style={ctaRow}>
                    <Link href="/browse" style={{ textDecoration: "none" }}>
                      <span style={primaryButton}>Browse Horses</span>
                    </Link>

                    <Link href="/messages" style={{ textDecoration: "none" }}>
                      <span style={secondaryButton}>Messages</span>
                    </Link>

                    <Link href={dashboardHref} style={{ textDecoration: "none" }}>
                      <span style={secondaryButton}>My Dashboard</span>
                    </Link>
                  </div>

                  <div style={heroStatsRow}>
                    <StatChip title="Active Horses" value={stats.activeHorses} />
                    <StatChip title="My Pending Requests" value={stats.myPendingRequests} />
                    <StatChip title="Unread Messages" value={stats.unreadMessages} />
                  </div>
                </>
              ) : (
                <>
                  <div style={ctaRow}>
                    <Link href="/login" style={{ textDecoration: "none" }}>
                      <span style={primaryButton}>Login</span>
                    </Link>

                    <Link href="/signup" style={{ textDecoration: "none" }}>
                      <span style={secondaryButton}>Sign Up</span>
                    </Link>

                    <Link href="/browse" style={{ textDecoration: "none" }}>
                      <span style={secondaryButton}>Browse Horses</span>
                    </Link>
                  </div>

                  <div style={heroStatsRow}>
                    <InfoChip title="Availability enforced" subtitle="Date conflicts blocked" />
                    <InfoChip title="Messaging built-in" subtitle="Keep it all in one place" />
                    <InfoChip title="Reviews & ratings" subtitle="Ride with confidence" />
                  </div>
                </>
              )}
            </div>

            {/* RIGHT */}
            <div style={heroVisualCard} aria-label="Brand and how it works">
              <div style={heroVisualInner}>
                <div style={logoRow}>
                  <div style={logoBadge}>
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
                    title="Browse listings"
                    copy="Explore horses, read profiles, and check details before you request."
                  />
                  <MiniCard
                    icon="📅"
                    title="Request dates"
                    copy="Send a date range request — availability rules prevent conflicts."
                  />
                  <MiniCard
                    icon="💬"
                    title="Coordinate & ride"
                    copy="Message inside the app, then leave a review to help the community."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marketing sections only for logged-out users */}
      {!isAuthed ? (
        <>
          <section style={section}>
            <div style={container}>
              <header style={sectionHeader}>
                <h2 style={sectionTitle}>How it works</h2>
                <p style={sectionSubtitle}>Built for both borrowers and owners — clear steps, clear expectations.</p>
              </header>

              <div style={twoColumn}>
                <div style={card}>
                  <div style={cardTopRow}>
                    <span style={rolePillBorrower}>For Borrowers</span>
                    <span style={mutedPill}>3 steps</span>
                  </div>

                  <ol style={stepList}>
                    <Step number="1" title="Browse active horses" copy="Explore listings and check details." />
                    <Step number="2" title="Request your dates" copy="Pick a date range. Conflicts are blocked." />
                    <Step number="3" title="Ride & review" copy="Coordinate via messaging and leave a review." />
                  </ol>
                </div>

                <div style={card}>
                  <div style={cardTopRow}>
                    <span style={rolePillOwner}>For Owners</span>
                    <span style={mutedPill}>3 steps</span>
                  </div>

                  <ol style={stepList}>
                    <Step number="1" title="List your horse" copy="Create a listing with clear expectations." />
                    <Step number="2" title="Approve trusted riders" copy="Review requests and chat before approving." />
                    <Step number="3" title="Manage availability" copy="Block dates and avoid overlaps automatically." />
                  </ol>
                </div>
              </div>
            </div>
          </section>

          <section style={sectionAlt}>
            <div style={container}>
              <header style={sectionHeader}>
                <h2 style={sectionTitle}>Trust & safety, baked in</h2>
                <p style={sectionSubtitle}>Profiles, messaging, and guardrails help keep things clear and comfortable.</p>
              </header>

              <div style={featureGrid}>
                <FeatureCard icon="⭐" title="Reviews & ratings" copy="Transparent feedback builds confidence over time." />
                <FeatureCard icon="🗓️" title="Date conflict enforcement" copy="Overlaps are blocked to keep schedules reliable." />
                <FeatureCard icon="💬" title="Messaging built-in" copy="Coordinate details without switching apps." />
                <FeatureCard icon="🪪" title="Profiles that matter" copy="See who you’re riding with before confirming." />
              </div>

              <div style={trustCtaBand}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 18, color: palette.navy }}>Ready to get started?</div>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>Create an account and start browsing today.</div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Link href="/login" style={{ textDecoration: "none" }}>
                    <span style={primaryButtonSmall}>Login</span>
                  </Link>
                  <Link href="/signup" style={{ textDecoration: "none" }}>
                    <span style={secondaryButtonSmall}>Sign Up</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <div style={{ height: 26 }} />
    </div>
  );
}

/* ---------- small pieces ---------- */

function InfoChip({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={infoChip}>
      <div style={{ fontWeight: 950, fontSize: 13, color: palette.navy }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{subtitle}</div>
    </div>
  );
}

function StatChip({ title, value }: { title: string; value: number }) {
  return (
    <div style={infoChip}>
      <div style={{ fontWeight: 950, fontSize: 22, color: palette.navy, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{title}</div>
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

/* ---------- styling ---------- */

const css = `
  :root { -webkit-tap-highlight-color: transparent; }
  @media (max-width: 900px) {
    .pmp-break { display: none; }
  }
`;

const fullBleedWrap: React.CSSProperties = {
  width: "100vw",
  marginLeft: "calc(50% - 50vw)",
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
  maxWidth: 680,
};

const ctaRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: 6,
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
  background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(245,241,232,0.65) 100%)",
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