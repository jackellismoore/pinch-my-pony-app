"use client";

import Link from "next/link";
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
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [stats, setStats] = useState<Stats>({
    activeHorses: 0,
    myPendingRequests: 0,
    unreadMessages: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      if (cancelled) return;

      setUserId(user?.id ?? null);

      if (user?.id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id,role,display_name,full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled) setProfile((p ?? null) as ProfileMini | null);

        try {
          const [{ count: activeHorses }, { count: pending }] = await Promise.all([
            supabase.from("horses").select("*", { count: "exact", head: true }).eq("is_active", true),
            supabase
              .from("requests")
              .select("*", { count: "exact", head: true })
              .eq("status", "pending")
              .eq("borrower_id", user.id),
          ]);

          if (!cancelled) {
            setStats({
              activeHorses: activeHorses ?? 0,
              myPendingRequests: pending ?? 0,
              unreadMessages: 0,
            });
          }
        } catch {}
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const user = session?.user ?? null;
      setUserId(user?.id ?? null);
      if (!user) {
        setProfile(null);
        setStats({ activeHorses: 0, myPendingRequests: 0, unreadMessages: 0 });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAuthed = !!userId;
  const isOwner = profile?.role === "owner";
  const dashboardHref = isOwner ? "/dashboard/owner" : "/dashboard/borrower";
  const welcomeLine = useMemo(() => `Welcome back, ${pickName(profile)}.`, [profile]);

  return (
    <div style={{ background: palette.cream }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>

          {/* LEFT SIDE */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={pill}>
              🐴 {isAuthed ? "Signed in" : "Borrow • Share • Ride — with trust built in"}
            </div>

            <h1 style={title}>
              {isAuthed ? (
                <>
                  {welcomeLine} <span style={{ color: palette.forest }}>Let’s ride.</span>
                </>
              ) : (
                <>
                  The warm, modern way to{" "}
                  <span style={{ color: palette.forest }}>borrow</span> or{" "}
                  <span style={{ color: palette.forest }}>share</span> a horse.
                </>
              )}
            </h1>

            <p style={subtitle}>
              {isAuthed
                ? "Manage requests, browse horses, and connect with confidence."
                : "Pinch My Pony is a trusted horse-borrowing marketplace. Owners list horses. Borrowers request dates. Everything stays organized."}
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {isAuthed ? (
                <>
                  <Link href="/browse" style={primaryBtn}>Browse Horses</Link>
                  <Link href="/messages" style={secondaryBtn}>Messages</Link>
                  <Link href={dashboardHref} style={secondaryBtn}>My Dashboard</Link>
                </>
              ) : (
                <>
                  <Link href="/login" style={primaryBtn}>Login</Link>
                  <Link href="/signup" style={secondaryBtn}>Sign Up</Link>
                </>
              )}
            </div>
          </div>

          {/* RIGHT SIDE CARD */}
          <div style={card}>
            <div style={logoBadge}>
              <img
                src="/pmp-logo.png"
                alt="Pinch My Pony logo"
                style={{
                  width: "90%",
                  height: "90%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            <div style={{ marginTop: 20 }}>
              <h3 style={{ margin: 0, color: palette.navy }}>How it works</h3>
              <p style={{ marginTop: 10, opacity: 0.75 }}>
                Browse horses, request dates, coordinate through messaging, and leave reviews.
              </p>
            </div>
          </div>
        </div>

        {/* Logged out marketing */}
        {!isAuthed && (
          <div style={{ marginTop: 60 }}>
            <h2 style={{ color: palette.navy }}>Trust & Safety</h2>
            <p style={{ maxWidth: 700, opacity: 0.8 }}>
              Reviews, availability enforcement, profiles, and built-in messaging keep everything clear and reliable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const pill: React.CSSProperties = {
  background: "rgba(31,61,43,0.08)",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 700,
  width: "fit-content",
};

const title: React.CSSProperties = {
  fontSize: 42,
  margin: 0,
  lineHeight: 1.1,
  color: "#1F2A44",
};

const subtitle: React.CSSProperties = {
  fontSize: 16,
  opacity: 0.85,
  maxWidth: 600,
};

const primaryBtn: React.CSSProperties = {
  background: "#1F3D2B",
  color: "white",
  padding: "12px 18px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 700,
};

const secondaryBtn: React.CSSProperties = {
  background: "white",
  color: "#1F2A44",
  padding: "12px 18px",
  borderRadius: 12,
  textDecoration: "none",
  border: "1px solid rgba(0,0,0,0.1)",
  fontWeight: 700,
};

const card: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  padding: 30,
  boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const logoBadge: React.CSSProperties = {
  width: 140,
  height: 140,
  borderRadius: 24,
  background: "white",
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};