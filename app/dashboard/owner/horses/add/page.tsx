"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

type HorseRow = {
  id: string;
  name: string | null;
  location: string | null;
  image_url: string | null;
  is_active: boolean | null;
  created_at: string;
};

const card: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
};

const btn = (kind: "primary" | "secondary") =>
  ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 950,
    whiteSpace: "nowrap",
    border: "1px solid rgba(31,42,68,0.16)",
    background: kind === "primary" ? `linear-gradient(180deg, ${palette.forest}, #173223)` : "rgba(255,255,255,0.72)",
    color: kind === "primary" ? "white" : palette.navy,
    boxShadow: kind === "primary" ? "0 14px 34px rgba(31,61,43,0.18)" : "0 14px 34px rgba(31,42,68,0.08)",
  }) as React.CSSProperties;

const h1: React.CSSProperties = { margin: 0, fontSize: 28, letterSpacing: -0.3, color: palette.navy, fontWeight: 950 };
const subtitle: React.CSSProperties = { marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.62)", lineHeight: 1.6 };

function pill(active: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
    letterSpacing: 0.2,
    border: "1px solid rgba(31,42,68,0.12)",
  };
  return active
    ? { ...base, background: "rgba(31,61,43,0.10)", color: palette.forest, border: "1px solid rgba(31,61,43,0.18)" }
    : { ...base, background: "rgba(220,0,0,0.06)", color: "rgba(160,0,0,0.95)", border: "1px solid rgba(220,0,0,0.18)" };
}

export default function OwnerHorsesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horses, setHorses] = useState<HorseRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!user) throw new Error("Not authenticated");

        const res = await supabase
          .from("horses")
          .select("id,name,location,image_url,is_active,created_at")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (res.error) throw res.error;
        if (!cancelled) setHorses((res.data ?? []) as HorseRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load horses.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = useMemo(() => horses.filter((h) => !!h.is_active).length, [horses]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={h1}>My Horses</h1>
          <div style={subtitle}>
            {activeCount} active • {horses.length} total
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/dashboard/owner" style={btn("secondary")}>
            ← Overview
          </Link>
          <Link href="/dashboard/owner/horses/add" style={btn("primary")}>
            Add a horse →
          </Link>
        </div>
      </div>

      {loading ? <div style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>Loading…</div> : null}

      {error ? (
        <div
          style={{
            marginTop: 16,
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

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {!loading && !error && horses.length === 0 ? (
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontWeight: 950, color: palette.navy }}>No horses yet</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)", lineHeight: 1.6 }}>
              Add your first listing to appear on the marketplace.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link href="/dashboard/owner/horses/add" style={btn("primary")}>
                Add a horse →
              </Link>
            </div>
          </div>
        ) : null}

        {horses.map((h) => {
          const isActive = !!h.is_active;

          return (
            <div
              key={h.id}
              style={{
                ...card,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                background: "linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(245,241,232,0.55) 140%)",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.06)",
                    border: "1px solid rgba(31,42,68,0.12)",
                    flexShrink: 0,
                  }}
                >
                  {h.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 950, fontSize: 15, color: palette.navy }}>{h.name ?? "Horse"}</div>
                    <span style={pill(isActive)}>{isActive ? "ACTIVE" : "INACTIVE"}</span>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.70)" }}>{h.location ?? "No location set"}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Link href={`/dashboard/owner/horses/edit/${h.id}`} style={btn("secondary")}>
                  Edit
                </Link>
                <Link href={`/dashboard/owner/horses/${h.id}/availability`} style={btn("secondary")}>
                  Availability
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}