"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

type Profile = {
  id: string;
  role: "owner" | "borrower" | null;
  beta_access: boolean | null;
  membership_tier: string | null;
  membership_status: string | null;
};

function wrap(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: "calc(100vh - 64px)",
    background:
      "radial-gradient(900px 420px at 20% 10%, rgba(200,162,77,0.18), transparent 55%), radial-gradient(900px 420px at 90% 30%, rgba(31,61,43,0.14), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 65%)",
    padding: "18px 0 calc(28px + env(safe-area-inset-bottom) + 76px)",
  };
}

function container(): React.CSSProperties {
  return { padding: 16, maxWidth: 980, margin: "0 auto" };
}

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(31,42,68,0.12)",
    borderRadius: 22,
    padding: 18,
    background: "rgba(255,255,255,0.80)",
    boxShadow: "0 16px 44px rgba(31,42,68,0.08)",
    backdropFilter: "blur(6px)",
  };
}

function softCard(): React.CSSProperties {
  return {
    border: "1px solid rgba(31,42,68,0.10)",
    borderRadius: 22,
    padding: 16,
    background: "rgba(255,255,255,0.72)",
    boxShadow: "0 12px 34px rgba(31,42,68,0.06)",
  };
}

function pill(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(31,61,43,0.16)",
    background: "rgba(31,61,43,0.08)",
    color: palette.forest,
    fontWeight: 900,
    fontSize: 12,
    width: "fit-content",
  };
}

function btn(kind: "primary" | "secondary", disabled?: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 14,
    padding: "11px 14px",
    fontSize: 13,
    fontWeight: 950,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    whiteSpace: "nowrap",
    border: "1px solid rgba(0,0,0,0.10)",
  };

  if (kind === "primary") {
    return {
      ...base,
      cursor: "not-allowed",
      background: "rgba(31,42,68,0.06)",
      color: "rgba(31,42,68,0.45)",
      boxShadow: "none",
    };
  }

  return {
    ...base,
    cursor: disabled ? "not-allowed" : "pointer",
    background: "rgba(255,255,255,0.78)",
    color: palette.navy,
    border: "1px solid rgba(31,42,68,0.18)",
    boxShadow: "0 12px 30px rgba(31,42,68,0.06)",
    opacity: disabled ? 0.6 : 1,
  };
}

export default function MembershipPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      if (cancelled) return;

      setAuthed(!!user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("id,role,beta_access,membership_tier,membership_status")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        if (pErr) setError(pErr.message);
        setProfile((p ?? null) as Profile | null);
        setLoading(false);
      }
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const statusLine = useMemo(() => {
    if (!authed) return "Log in to view plans.";
    if (!profile) return "You’re currently on the free plan.";
    const tier = (profile.membership_tier ?? "free").toUpperCase();
    const status = profile.membership_status ?? "inactive";
    return `Plan: ${tier} • Status: ${status}`;
  }, [authed, profile]);

  return (
    <>
      <style>{`
        .pmp-membershipGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        @media (max-width: 767px) {
          .pmp-membershipGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={wrap()}>
        <div style={container()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={pill()}>💳 Memberships</div>
              <h1
                style={{
                  margin: 0,
                  marginTop: 10,
                  fontSize: 24,
                  fontWeight: 950,
                  color: palette.navy,
                  letterSpacing: -0.3,
                }}
              >
                Memberships
              </h1>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "rgba(31,42,68,0.72)",
                  lineHeight: 1.7,
                }}
              >
                Pinch My Pony will stay free until 2027 while we build our customer base.
              </div>
            </div>

            <Link href="/" style={btn("secondary")}>
              ← Home
            </Link>
          </div>

          <div style={{ marginTop: 14, ...card() }}>
            {loading ? (
              <div style={{ fontSize: 13, color: "rgba(31,42,68,0.70)", fontWeight: 850 }}>
                Loading…
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "rgba(31,42,68,0.78)", fontWeight: 900 }}>
                {statusLine}
              </div>
            )}

            {!authed ? (
              <div
                style={{
                  marginTop: 12,
                  ...softCard(),
                  fontSize: 13,
                  color: "rgba(31,42,68,0.75)",
                  lineHeight: 1.7,
                }}
              >
                You’re not logged in.{" "}
                <Link
                  href="/login"
                  style={{ color: palette.forest, fontWeight: 950, textDecoration: "none" }}
                >
                  Login
                </Link>{" "}
                to view your account details.
              </div>
            ) : null}

            <div
              style={{
                marginTop: 12,
                borderRadius: 18,
                border: "1px solid rgba(200,162,77,0.22)",
                background: "rgba(200,162,77,0.10)",
                padding: 12,
                fontSize: 13,
                fontWeight: 850,
                color: "rgba(31,42,68,0.82)",
                lineHeight: 1.6,
              }}
            >
              <b>Membership payments are currently disabled.</b>
              <div style={{ marginTop: 6, opacity: 0.92 }}>
                All users can continue to use Pinch My Pony free of charge until 2027. Paid plans
                will be enabled later, once the platform is more established.
              </div>
            </div>

            {error ? (
              <div
                style={{
                  marginTop: 12,
                  border: "1px solid rgba(255,0,0,0.25)",
                  background: "rgba(255,0,0,0.06)",
                  padding: 12,
                  borderRadius: 14,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            ) : null}

            <div className="pmp-membershipGrid" style={{ marginTop: 14 }}>
              <div style={softCard()}>
                <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>
                  Borrower Membership
                </div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8, lineHeight: 1.65 }}>
                  £5 / month later. Free until 2027.
                </div>

                <ul
                  style={{
                    margin: "10px 0 0",
                    paddingLeft: 18,
                    fontSize: 13,
                    opacity: 0.82,
                    lineHeight: 1.7,
                  }}
                >
                  <li>Priority features and perks</li>
                  <li>Member-only improvements</li>
                  <li>Support the marketplace</li>
                </ul>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button disabled style={btn("primary", true)}>
                    Coming in 2027
                  </button>
                </div>
              </div>

              <div style={softCard()}>
                <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>
                  Owner Membership
                </div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8, lineHeight: 1.65 }}>
                  £10 / month later. Free until 2027.
                </div>

                <ul
                  style={{
                    margin: "10px 0 0",
                    paddingLeft: 18,
                    fontSize: 13,
                    opacity: 0.82,
                    lineHeight: 1.7,
                  }}
                >
                  <li>Enhanced listing tools</li>
                  <li>Better visibility and controls</li>
                  <li>Owner analytics</li>
                </ul>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button disabled style={btn("primary", true)}>
                    Coming in 2027
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                fontSize: 12,
                color: "rgba(31,42,68,0.70)",
                lineHeight: 1.7,
              }}
            >
              This page is intentionally informational only for now. No Stripe checkout is started
              from here.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}