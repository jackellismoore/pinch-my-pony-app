"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ---------------------------
   Types
----------------------------*/

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

/* ---------------------------
   Helpers
----------------------------*/

function pickName(p: ProfileMini | null) {
  const dn = (p?.display_name ?? "").trim();
  const fn = (p?.full_name ?? "").trim();
  return dn || fn || "there";
}

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

/* ---------------------------
   Component
----------------------------*/

export default function HomePage() {
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [stats, setStats] = useState<Stats>({
    activeHorses: 0,
    myPendingRequests: 0,
    unreadMessages: 0,
  });

  /* ---------------------------
     Load Profile + Stats
  ----------------------------*/

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || cancelled) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("id,role,display_name,full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) setProfile((p ?? null) as ProfileMini | null);

      // 🔹 Fetch dynamic stats (safe even if tables differ)
      const [{ count: activeHorses }, { count: myPendingRequests }] =
        await Promise.all([
          supabase
            .from("horses")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),
          supabase
            .from("requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending")
            .eq("borrower_id", user.id),
        ]);

      if (!cancelled) {
        setStats({
          activeHorses: activeHorses ?? 0,
          myPendingRequests: myPendingRequests ?? 0,
          unreadMessages: 0, // wire later if you track unread
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isOwner = profile?.role === "owner";
  const dashboardHref = isOwner ? "/dashboard/owner" : "/dashboard/borrower";
  const welcome = useMemo(() => `Welcome back, ${pickName(profile)}.`, [profile]);

  /* ---------------------------
     Render
  ----------------------------*/

  return (
    <div className="pmp-full">
      <section className="pmp-hero">
        <div className="pmp-container">
          <div className="pmp-hero-grid">
            {/* LEFT */}
            <div>
              <div className="pmp-pill">
                🐴 Signed in • {isOwner ? "Owner" : "Borrower"} mode
              </div>

              <h1 className="pmp-title">
                {welcome} <span className="pmp-accent">Let’s ride.</span>
              </h1>

              <p className="pmp-sub">
                Manage your requests, browse horses, and connect with confidence.
              </p>

              {/* QUICK ACTIONS */}
              <div className="pmp-actions">
                <Link href="/browse" className="pmp-btn-primary">
                  Browse Horses
                </Link>

                <Link href="/messages" className="pmp-btn-secondary">
                  Messages
                </Link>

                <Link href={dashboardHref} className="pmp-btn-tertiary">
                  My Dashboard
                </Link>
              </div>

              {/* LIVE STATS */}
              <div className="pmp-stats">
                <StatCard
                  label="Active Horses"
                  value={stats.activeHorses}
                />
                <StatCard
                  label="My Pending Requests"
                  value={stats.myPendingRequests}
                />
                <StatCard
                  label="Unread Messages"
                  value={stats.unreadMessages}
                />
              </div>
            </div>

            {/* RIGHT VISUAL */}
            <div className="pmp-card">
              <div className="pmp-logo-row">
                <Image
                  src="/pmp-logo.png"
                  alt="Pinch My Pony"
                  width={90}
                  height={90}
                  priority
                />
                <div>
                  <div className="pmp-brand">Pinch My Pony</div>
                  <div className="pmp-tag">
                    A modern horse borrowing marketplace
                  </div>
                </div>
              </div>

              <div className="pmp-tip">
                <strong>Tip:</strong> Start by browsing horses and sending a
                date request. Everything stays organized in your dashboard.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CSS */}
      <style jsx global>{`
        .pmp-full {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          background: ${palette.cream};
        }

        .pmp-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 16px;
        }

        .pmp-hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 24px;
        }

        .pmp-pill {
          display: inline-block;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(31, 61, 43, 0.08);
          font-weight: 900;
          font-size: 13px;
        }

        .pmp-title {
          margin: 12px 0 6px;
          font-size: 40px;
          color: ${palette.navy};
        }

        .pmp-accent {
          color: ${palette.forest};
        }

        .pmp-sub {
          font-size: 16px;
          opacity: 0.8;
          margin-bottom: 18px;
        }

        .pmp-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .pmp-btn-primary {
          padding: 12px 18px;
          border-radius: 14px;
          background: ${palette.forest};
          color: white;
          font-weight: 900;
          text-decoration: none;
        }

        .pmp-btn-secondary {
          padding: 12px 18px;
          border-radius: 14px;
          background: white;
          border: 1px solid #ddd;
          font-weight: 900;
          text-decoration: none;
          color: ${palette.navy};
        }

        .pmp-btn-tertiary {
          padding: 12px 18px;
          border-radius: 14px;
          background: ${palette.gold};
          font-weight: 900;
          text-decoration: none;
          color: ${palette.navy};
        }

        .pmp-stats {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .pmp-card {
          padding: 24px;
          border-radius: 24px;
          background: white;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
        }

        .pmp-logo-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .pmp-brand {
          font-weight: 950;
          font-size: 20px;
          color: ${palette.navy};
        }

        .pmp-tag {
          font-size: 13px;
          opacity: 0.7;
        }

        .pmp-tip {
          margin-top: 18px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(31, 61, 43, 0.05);
        }

        /* ---------------- MOBILE ---------------- */

        @media (max-width: 900px) {
          .pmp-hero-grid {
            grid-template-columns: 1fr;
          }

          .pmp-stats {
            grid-template-columns: 1fr;
          }

          .pmp-title {
            font-size: 30px;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------
   Stat Card
----------------------------*/

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background: "white",
        boxShadow: "0 12px 30px rgba(0,0,0,0.05)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 950 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
    </div>
  );
}