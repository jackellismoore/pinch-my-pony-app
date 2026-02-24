"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
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
    padding: "18px 0 28px",
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
      cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "rgba(31,42,68,0.06)" : `linear-gradient(180deg, ${palette.forest}, #173223)`,
      color: disabled ? "rgba(31,42,68,0.45)" : "white",
      boxShadow: disabled ? "none" : "0 14px 34px rgba(31,61,43,0.18)",
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

  const [busy, setBusy] = useState<"borrower" | "owner" | null>(null);
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

  const canCheckout = !!profile?.beta_access;

  const statusLine = useMemo(() => {
    if (!authed) return "Log in to view plans.";
    if (!profile) return "You’re currently on the free plan.";
    const tier = (profile.membership_tier ?? "free").toUpperCase();
    const status = profile.membership_status ?? "inactive";
    return `Plan: ${tier} • Status: ${status}`;
  }, [authed, profile]);

  async function startCheckout(plan: "borrower" | "owner") {
    try {
      setError(null);
      setBusy(plan);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please log in first.");

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Checkout failed.");

      if (json?.url) window.location.assign(json.url);
    } catch (e: any) {
      setError(e?.message ?? "Checkout failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={wrap()}>
      <div style={container()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <div style={pill()}>💳 Memberships</div>
            <h1 style={{ margin: 0, marginTop: 10, fontSize: 24, fontWeight: 950, color: palette.navy, letterSpacing: -0.3 }}>
              Memberships
            </h1>
            <div style={{ marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.72)", lineHeight: 1.7 }}>
              Set up now, charge later. Everyone stays free while you build your customer base.
            </div>
          </div>

          <Link href="/browse" style={btn("secondary")}>
            ← Browse
          </Link>
        </div>

        <div style={{ marginTop: 14, ...card() }}>
          {loading ? (
            <div style={{ fontSize: 13, color: "rgba(31,42,68,0.70)", fontWeight: 850 }}>Loading…</div>
          ) : (
            <div style={{ fontSize: 13, color: "rgba(31,42,68,0.78)", fontWeight: 900 }}>{statusLine}</div>
          )}

          {!authed ? (
            <div style={{ marginTop: 12, ...softCard(), fontSize: 13, color: "rgba(31,42,68,0.75)", lineHeight: 1.7 }}>
              You’re not logged in.{" "}
              <Link href="/login" style={{ color: palette.forest, fontWeight: 950, textDecoration: "none" }}>
                Login
              </Link>{" "}
              to view and manage memberships.
            </div>
          ) : null}

          {authed && !canCheckout ? (
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
              Membership checkout is currently <b>disabled</b> while we build the community.
              <div style={{ marginTop: 6, opacity: 0.92 }}>
                When you’re ready, enable it by setting <code>profiles.beta_access</code> to <code>true</code> (for you only, or everyone).
              </div>
            </div>
          ) : null}

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

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            {/* Borrower */}
            <div style={softCard()}>
              <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>Borrower Membership</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8, lineHeight: 1.65 }}>
                £5 / month (later). Built for frequent riders.
              </div>

              <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, opacity: 0.82, lineHeight: 1.7 }}>
                <li>Priority features and perks</li>
                <li>Member-only improvements (coming soon)</li>
                <li>Support the marketplace</li>
              </ul>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => startCheckout("borrower")}
                  disabled={!authed || !canCheckout || busy !== null}
                  style={btn("primary", !authed || !canCheckout || busy !== null) as any}
                >
                  {busy === "borrower" ? "Starting…" : canCheckout ? "Upgrade" : "Coming soon"}
                </button>
              </div>
            </div>

            {/* Owner */}
            <div style={softCard()}>
              <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>Owner Membership</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8, lineHeight: 1.65 }}>
                £10 / month (later). Built for active owners.
              </div>

              <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, opacity: 0.82, lineHeight: 1.7 }}>
                <li>Enhanced listing tools</li>
                <li>Better visibility & controls</li>
                <li>Owner analytics (coming soon)</li>
              </ul>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => startCheckout("owner")}
                  disabled={!authed || !canCheckout || busy !== null}
                  style={btn("primary", !authed || !canCheckout || busy !== null) as any}
                >
                  {busy === "owner" ? "Starting…" : canCheckout ? "Upgrade" : "Coming soon"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: "rgba(31,42,68,0.70)", lineHeight: 1.7 }}>
            Billing is intentionally off right now. When you flip it on, you’ll switch to live Stripe keys and enable access.
          </div>
        </div>
      </div>
    </div>
  );
}