"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileMini = {
  id: string;
  role: "owner" | "borrower" | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  verification_status?: string | null;
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

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);

    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(t);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(t);
        reject(err);
      });
  });
}

export default function HomePage() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [stats, setStats] = useState<Stats>({
    activeHorses: 0,
    myPendingRequests: 0,
    unreadMessages: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          "session load"
        );

        const u = data.session?.user ?? null;

        if (cancelled) return;

        setSessionUserId(u?.id ?? null);

        if (!u?.id) {
          setProfile(null);
          setStats({
            activeHorses: 0,
            myPendingRequests: 0,
            unreadMessages: 0,
          });
          return;
        }

        let nextProfile: ProfileMini | null = null;

        try {
          const profileRes = await withTimeout(
            supabase
              .from("profiles")
              .select("id,role,display_name,full_name,avatar_url,verification_status")
              .eq("id", u.id)
              .maybeSingle(),
            5000,
            "profile load"
          );

          nextProfile = (profileRes.data ?? null) as ProfileMini | null;
        } catch {
          nextProfile = null;
        }

        if (cancelled) return;

        setProfile(nextProfile);

        const role = nextProfile?.role ?? null;

        const unreadPromise = withTimeout(
          supabase
            .from("message_threads")
            .select("request_id,unread_count")
            .gt("unread_count", 0),
          5000,
          "message thread stats"
        );

        const pendingPromise =
          role === "owner"
            ? withTimeout(
                supabase
                  .from("borrow_requests")
                  .select("*", { count: "exact", head: true })
                  .eq("status", "pending"),
                5000,
                "pending requests"
              )
            : withTimeout(
                supabase
                  .from("borrow_requests")
                  .select("*", { count: "exact", head: true })
                  .eq("status", "pending")
                  .eq("borrower_id", u.id),
                5000,
                "pending requests"
              );

        const activePromise =
          role === "owner"
            ? withTimeout(
                supabase
                  .from("horses")
                  .select("*", { count: "exact", head: true })
                  .eq("owner_id", u.id)
                  .or("active.eq.true,is_active.eq.true"),
                5000,
                "active horses"
              )
            : withTimeout(
                supabase
                  .from("horses")
                  .select("*", { count: "exact", head: true })
                  .or("active.eq.true,is_active.eq.true"),
                5000,
                "active horses"
              );

        const [activeRes, pendingRes, unreadRes] = await Promise.allSettled([
          activePromise,
          pendingPromise,
          unreadPromise,
        ]);

        const unreadTotal =
          unreadRes.status === "fulfilled"
            ? ((unreadRes.value.data ?? []) as Array<{ unread_count: number }>).reduce(
                (sum, row) => sum + Number(row.unread_count ?? 0),
                0
              )
            : 0;

        if (!cancelled) {
          setStats({
            activeHorses:
              activeRes.status === "fulfilled" ? (activeRes.value.count ?? 0) : 0,
            myPendingRequests:
              pendingRes.status === "fulfilled" ? (pendingRes.value.count ?? 0) : 0,
            unreadMessages: unreadTotal,
          });
        }
      } catch {
        if (!cancelled) {
          setSessionUserId(null);
          setProfile(null);
          setStats({
            activeHorses: 0,
            myPendingRequests: 0,
            unreadMessages: 0,
          });
        }
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      const u = sess?.user ?? null;
      setSessionUserId(u?.id ?? null);

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
  const isVerified = String(profile?.verification_status ?? "").toLowerCase() === "verified";

  const welcomeLine = useMemo(() => `Welcome back, ${pickName(profile)}.`, [profile]);

  return (
    <div style={{ width: "100%" }}>
      <style>{`
        @media (max-width: 980px) {
          .pmp-home-hero-grid { grid-template-columns: 1fr !important; }
          .pmp-home-two-col { grid-template-columns: 1fr !important; }
          .pmp-home-feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }

        @media (max-width: 767px) {
          .pmp-home-stats,
          .pmp-home-feature-grid {
            grid-template-columns: 1fr !important;
          }

          .pmp-home-title {
            font-size: 32px !important;
          }

          .pmp-home-cta-row {
            flex-direction: column;
            align-items: stretch !important;
          }

          .pmp-home-cta-row a,
          .pmp-home-cta-row a > span {
            width: 100%;
          }
        }
      `}</style>

      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "18px 0 20px",
          background: palette.cream,
          borderRadius: 24,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(900px 420px at 20% 10%, rgba(200,162,77,0.22), transparent 55%), radial-gradient(900px 420px at 90% 30%, rgba(31,61,43,0.18), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 65%)",
          }}
        />

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 12px", position: "relative" }}>
          <div
            className="pmp-home-hero-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.05fr 0.95fr",
              gap: 18,
              alignItems: "stretch",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  width: "fit-content",
                  maxWidth: "100%",
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "rgba(31,61,43,0.08)",
                  border: "1px solid rgba(31,61,43,0.12)",
                  color: palette.forest,
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                <span aria-hidden="true">🐴</span>
                <span>
                  {isAuthed ? "Signed in • Your account is ready" : "Borrow • Share • Ride — with trust built in"}
                </span>
              </div>

              <h1
                className="pmp-home-title"
                style={{
                  margin: 0,
                  fontSize: 44,
                  lineHeight: 1.06,
                  letterSpacing: -0.6,
                  color: palette.navy,
                }}
              >
                {isAuthed ? (
                  <>
                    {welcomeLine}{" "}
                    <span
                      style={{
                        color: palette.forest,
                        textDecoration: "underline",
                        textDecorationThickness: "6px",
                        textUnderlineOffset: "6px",
                        textDecorationColor: "rgba(200,162,77,0.45)",
                      }}
                    >
                      Let’s ride.
                    </span>
                  </>
                ) : (
                  <>
                    The warm, modern way to{" "}
                    <span
                      style={{
                        color: palette.forest,
                        textDecoration: "underline",
                        textDecorationThickness: "6px",
                        textUnderlineOffset: "6px",
                        textDecorationColor: "rgba(200,162,77,0.45)",
                      }}
                    >
                      borrow
                    </span>{" "}
                    or{" "}
                    <span
                      style={{
                        color: palette.forest,
                        textDecoration: "underline",
                        textDecorationThickness: "6px",
                        textUnderlineOffset: "6px",
                        textDecorationColor: "rgba(200,162,77,0.45)",
                      }}
                    >
                      share
                    </span>{" "}
                    a horse.
                  </>
                )}
              </h1>

              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, opacity: 0.9, maxWidth: 680 }}>
                {isAuthed
                  ? "Manage requests, browse horses, and connect with confidence — everything stays organised in one place."
                  : "Pinch My Pony is a trusted horse-borrowing marketplace. Owners list horses, borrowers request dates, and everyone rides with clear rules and reviews."}
              </p>

              {isAuthed ? (
                <>
                  <div className="pmp-home-cta-row" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <Link href="/browse" style={{ textDecoration: "none" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 46,
                          padding: "12px 16px",
                          borderRadius: 14,
                          background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
                          color: "white",
                          fontWeight: 950,
                          border: "1px solid rgba(0,0,0,0.10)",
                          boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
                        }}
                      >
                        Browse Horses
                      </span>
                    </Link>

                    <Link href="/messages" style={{ textDecoration: "none" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 46,
                          padding: "12px 16px",
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.75)",
                          color: palette.navy,
                          fontWeight: 950,
                          border: "1px solid rgba(31,42,68,0.18)",
                          boxShadow: "0 14px 34px rgba(31,42,68,0.08)",
                        }}
                      >
                        Messages
                      </span>
                    </Link>

                    <Link href={dashboardHref} style={{ textDecoration: "none" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 46,
                          padding: "12px 16px",
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.75)",
                          color: palette.navy,
                          fontWeight: 950,
                          border: "1px solid rgba(31,42,68,0.18)",
                          boxShadow: "0 14px 34px rgba(31,42,68,0.08)",
                        }}
                      >
                        My Dashboard
                      </span>
                    </Link>
                  </div>

                  <div
                    className="pmp-home-stats"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    <StatChip title={isOwner ? "My active horses" : "Active horses"} value={stats.activeHorses} />
                    <StatChip title="Pending requests" value={stats.myPendingRequests} />
                    <StatChip title="Unread messages" value={stats.unreadMessages} />
                  </div>
                </>
              ) : (
                <>
                  <div className="pmp-home-cta-row" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <Link href="/signup/borrower" style={{ textDecoration: "none" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 46,
                          padding: "12px 16px",
                          borderRadius: 14,
                          background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
                          color: "white",
                          fontWeight: 950,
                          border: "1px solid rgba(0,0,0,0.10)",
                          boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
                        }}
                      >
                        I want to borrow
                      </span>
                    </Link>

                    <Link href="/signup/owner" style={{ textDecoration: "none" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 46,
                          padding: "12px 16px",
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.75)",
                          color: palette.navy,
                          fontWeight: 950,
                          border: "1px solid rgba(31,42,68,0.18)",
                          boxShadow: "0 14px 34px rgba(31,42,68,0.08)",
                        }}
                      >
                        I want to list my horse
                      </span>
                    </Link>

                    <Link href="/browse" style={{ textDecoration: "none" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 46,
                          padding: "12px 16px",
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.75)",
                          color: palette.navy,
                          fontWeight: 950,
                          border: "1px solid rgba(31,42,68,0.18)",
                          boxShadow: "0 14px 34px rgba(31,42,68,0.08)",
                        }}
                      >
                        Browse Horses
                      </span>
                    </Link>
                  </div>

                  <div
                    className="pmp-home-stats"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    <InfoChip title="Availability enforced" subtitle="Date conflicts blocked" />
                    <InfoChip title="Messaging built-in" subtitle="Keep it all in one place" />
                    <InfoChip title="Reviews & ratings" subtitle="Ride with confidence" />
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                borderRadius: 22,
                border: "1px solid rgba(31,42,68,0.12)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(245,241,232,0.65) 100%)",
                boxShadow: "0 22px 60px rgba(31,42,68,0.12)",
                overflow: "hidden",
                minHeight: 360,
              }}
            >
              <div style={{ padding: 18, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 24,
                      background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,247,240,0.96))",
                      border: "1px solid rgba(15,23,42,0.10)",
                      boxShadow: "0 16px 40px rgba(15,23,42,0.10)",
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="/pmp-logo-web.png"
                      alt="Pinch My Pony logo"
                      style={{ width: "92%", height: "92%", objectFit: "contain", display: "block" }}
                    />
                  </div>

                  <div style={{ lineHeight: 1.15, minWidth: 0 }}>
                    <div style={{ fontWeight: 950, fontSize: 20, color: palette.navy }}>Pinch My Pony</div>
                    <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.7 }}>
                      Horse borrowing marketplace
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: "rgba(31,42,68,0.10)", margin: "4px 0" }} />

                <div style={{ display: "grid", gap: 10 }}>
                  <MiniCard icon="🧭" title="Browse listings" copy="Explore horses, read profiles, and compare listings quickly." />
                  <MiniCard icon="📅" title="Request dates" copy="Send a request with date conflict protection built in." />
                  <MiniCard icon="💬" title="Coordinate & ride" copy="Keep communication organised in one place." />
                </div>

                {isAuthed ? (
                  <div
                    style={{
                      marginTop: 4,
                      padding: 12,
                      borderRadius: 18,
                      border: "1px solid rgba(31,42,68,0.10)",
                      background: "rgba(31,61,43,0.06)",
                    }}
                  >
                    <div style={{ fontWeight: 950, color: palette.navy }}>Your trust status</div>
                    <div style={{ opacity: 0.78, marginTop: 4, lineHeight: 1.55 }}>
                      {isVerified
                        ? "Your identity is verified. Keep your profile photo, bio, and location up to date to build even more trust."
                        : "Verification is still pending. Completing it helps owners and riders feel more confident."}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 4,
                      padding: 12,
                      borderRadius: 18,
                      border: "1px solid rgba(31,42,68,0.10)",
                      background: "rgba(31,61,43,0.06)",
                    }}
                  >
                    <div style={{ fontWeight: 950, color: palette.navy }}>New here?</div>
                    <div style={{ opacity: 0.78, marginTop: 4, lineHeight: 1.55 }}>
                      Create an account to request dates, message owners, and access your dashboard.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {!isAuthed ? (
        <>
          <section style={{ padding: "24px 0", background: "#fafafa" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 12px" }}>
              <header style={{ display: "grid", gap: 8, margin: "0 0 16px" }}>
                <h2 style={{ margin: 0, fontSize: 28, letterSpacing: -0.3, color: palette.navy }}>How it works</h2>
                <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.65, maxWidth: 780 }}>
                  Built for both borrowers and owners — clear steps, clear expectations.
                </p>
              </header>

              <div className="pmp-home-two-col" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                <RoleCard
                  pill="For Borrowers"
                  steps={[
                    ["1", "Browse active horses", "Explore listings and check details."],
                    ["2", "Request your dates", "Pick a date range. Conflicts are blocked."],
                    ["3", "Ride & review", "Coordinate via messaging and leave a review."],
                  ]}
                  borrower
                />
                <RoleCard
                  pill="For Owners"
                  steps={[
                    ["1", "List your horse", "Create a listing with clear expectations."],
                    ["2", "Approve trusted riders", "Review requests and chat before approving."],
                    ["3", "Manage availability", "Block dates and avoid overlaps automatically."],
                  ]}
                />
              </div>
            </div>
          </section>

          <section style={{ padding: "24px 0", background: `linear-gradient(180deg, #fafafa 0%, rgba(245,241,232,0.7) 100%)` }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 12px" }}>
              <header style={{ display: "grid", gap: 8, margin: "0 0 16px" }}>
                <h2 style={{ margin: 0, fontSize: 28, letterSpacing: -0.3, color: palette.navy }}>Trust & safety, baked in</h2>
                <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.65, maxWidth: 780 }}>
                  Profiles, messaging, and guardrails help keep things clear and comfortable.
                </p>
              </header>

              <div className="pmp-home-feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 10 }}>
                <FeatureCard icon="⭐" title="Reviews & ratings" copy="Transparent feedback builds confidence over time." />
                <FeatureCard icon="🗓️" title="Date conflict enforcement" copy="Overlaps are blocked to keep schedules reliable." />
                <FeatureCard icon="💬" title="Messaging built-in" copy="Coordinate details without switching apps." />
                <FeatureCard icon="🪪" title="Profiles that matter" copy="See who you’re riding with before confirming." />
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function InfoChip({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ padding: "12px 12px", borderRadius: 16, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,42,68,0.10)", boxShadow: "0 12px 30px rgba(31,42,68,0.06)" }}>
      <div style={{ fontWeight: 950, fontSize: 13, color: palette.navy }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{subtitle}</div>
    </div>
  );
}

function StatChip({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ padding: "12px 12px", borderRadius: 16, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(31,42,68,0.10)", boxShadow: "0 12px 30px rgba(31,42,68,0.06)" }}>
      <div style={{ fontWeight: 950, fontSize: 22, color: palette.navy, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{title}</div>
    </div>
  );
}

function MiniCard({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 10, padding: "12px 12px", borderRadius: 18, border: "1px solid rgba(31,42,68,0.10)", background: "rgba(255,255,255,0.70)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(200,162,77,0.20)", border: "1px solid rgba(200,162,77,0.28)", display: "grid", placeItems: "center", fontSize: 18 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 950, color: palette.navy }}>{title}</div>
        <div style={{ opacity: 0.75, fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{copy}</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return (
    <div style={{ borderRadius: 22, border: "1px solid rgba(31,42,68,0.12)", background: "rgba(255,255,255,0.82)", boxShadow: "0 18px 50px rgba(31,42,68,0.08)", padding: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 16, background: "rgba(31,61,43,0.10)", border: "1px solid rgba(31,61,43,0.14)", display: "grid", placeItems: "center", fontSize: 18, marginBottom: 10 }}>
        {icon}
      </div>
      <div style={{ fontWeight: 950, color: palette.navy }}>{title}</div>
      <div style={{ opacity: 0.78, marginTop: 6, lineHeight: 1.6 }}>{copy}</div>
    </div>
  );
}

function RoleCard({
  pill,
  steps,
  borrower,
}: {
  pill: string;
  steps: [string, string, string][];
  borrower?: boolean;
}) {
  return (
    <div style={{ borderRadius: 22, border: "1px solid rgba(31,42,68,0.12)", background: "white", boxShadow: "0 18px 50px rgba(31,42,68,0.08)", padding: 18, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            fontWeight: 950,
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 999,
            border: borrower ? "1px solid rgba(31,61,43,0.18)" : "1px solid rgba(139,94,60,0.22)",
            background: borrower ? "rgba(31,61,43,0.08)" : "rgba(139,94,60,0.10)",
            color: borrower ? palette.forest : palette.saddle,
          }}
        >
          {pill}
        </span>
        <span style={{ fontWeight: 900, fontSize: 12, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(31,42,68,0.14)", background: "rgba(31,42,68,0.04)", color: palette.navy, opacity: 0.85 }}>
          3 steps
        </span>
      </div>

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        {steps.map(([n, title, copy]) => (
          <li key={n} style={{ display: "grid", gridTemplateColumns: "38px 1fr", gap: 12, alignItems: "start" }}>
            <div style={{ width: 38, height: 38, borderRadius: 14, background: "rgba(200,162,77,0.22)", border: "1px solid rgba(200,162,77,0.28)", display: "grid", placeItems: "center", fontWeight: 950, color: palette.navy }}>
              {n}
            </div>
            <div>
              <div style={{ fontWeight: 950, color: palette.navy }}>{title}</div>
              <div style={{ opacity: 0.8, marginTop: 4, lineHeight: 1.6 }}>{copy}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}