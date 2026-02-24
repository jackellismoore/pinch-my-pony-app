"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";

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
  is_active: boolean | null;
};

type BlockRow = {
  id: string;
  horse_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
};

type BookingRow = {
  id: string;
  horse_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

type UnifiedRange = {
  kind: "blocked" | "booking";
  horseId: string;
  startDate: string;
  endDate: string;
  label: string;
  sourceId: string;
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

const card: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
};

const sectionCard: React.CSSProperties = {
  ...card,
  padding: 16,
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
    background:
      kind === "primary"
        ? `linear-gradient(180deg, ${palette.forest}, #173223)`
        : "rgba(255,255,255,0.72)",
    color: kind === "primary" ? "white" : palette.navy,
    boxShadow:
      kind === "primary"
        ? "0 14px 34px rgba(31,61,43,0.18)"
        : "0 14px 34px rgba(31,42,68,0.08)",
  }) as React.CSSProperties;

export default function OwnerDashboardHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [ranges, setRanges] = useState<UnifiedRange[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        if (!cancelled) {
          setError(userErr?.message ?? "Not authenticated");
          setLoading(false);
        }
        return;
      }

      const { data: horsesData, error: horsesErr } = await supabase
        .from("horses")
        .select("id,name,is_active")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (horsesErr) {
        setError(horsesErr.message);
        setLoading(false);
        return;
      }

      const horseRows = (horsesData ?? []) as HorseRow[];
      setHorses(horseRows);

      const horseIds = horseRows.map((h) => h.id);
      if (horseIds.length === 0) {
        setRanges([]);
        setLoading(false);
        return;
      }

      const today = todayISODate();

      const [blocksRes, bookingsRes] = await Promise.all([
        supabase
          .from("horse_unavailability")
          .select("id,horse_id,start_date,end_date,reason,created_at")
          .in("horse_id", horseIds)
          .gte("end_date", today)
          .order("start_date", { ascending: true }),

        supabase
          .from("borrow_requests")
          .select("id,horse_id,start_date,end_date,created_at,status")
          .in("horse_id", horseIds)
          .eq("status", "approved")
          .not("start_date", "is", null)
          .not("end_date", "is", null)
          .gte("end_date", today)
          .order("start_date", { ascending: true }),
      ]);

      if (cancelled) return;

      if (blocksRes.error) {
        setError(blocksRes.error.message);
        setLoading(false);
        return;
      }
      if (bookingsRes.error) {
        setError(bookingsRes.error.message);
        setLoading(false);
        return;
      }

      const blocks = (blocksRes.data ?? []) as BlockRow[];
      const bookings = (bookingsRes.data ?? []) as BookingRow[];

      const unified: UnifiedRange[] = [
        ...blocks.map((b) => ({
          kind: "blocked" as const,
          horseId: b.horse_id,
          startDate: b.start_date,
          endDate: b.end_date,
          label: b.reason?.trim() ? b.reason.trim() : "Blocked",
          sourceId: b.id,
        })),
        ...bookings.map((br) => ({
          kind: "booking" as const,
          horseId: br.horse_id,
          startDate: br.start_date,
          endDate: br.end_date,
          label: "Approved booking",
          sourceId: br.id,
        })),
      ].sort((a, b) => a.startDate.localeCompare(b.startDate));

      setRanges(unified);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const horseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of horses) map.set(h.id, h.name ?? "Unnamed horse");
    return map;
  }, [horses]);

  const upcoming = useMemo(() => ranges.slice(0, 10), [ranges]);

  const activeCount = useMemo(() => horses.filter((h) => h.is_active).length, [horses]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Title Row */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.3, color: palette.navy, fontWeight: 950 }}>
            Owner Overview
          </h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.62)", lineHeight: 1.6 }}>
            Upcoming blocks + approved bookings across your horses.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/dashboard/owner/requests" style={btn("secondary")}>
            Requests →
          </Link>
          <Link href="/dashboard/owner/horses" style={btn("primary")}>
            Manage Horses →
          </Link>
        </div>
      </div>

      {/* Stat strip */}
      <div
        style={{
          marginTop: 16,
          ...card,
          padding: 14,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,241,232,0.55) 140%)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", fontWeight: 900 }}>Listings</div>
          <div style={{ fontSize: 16, fontWeight: 950, color: palette.navy }}>
            {horses.length} total • {activeCount} active
          </div>
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", fontWeight: 900 }}>Upcoming</div>
          <div style={{ fontSize: 16, fontWeight: 950, color: palette.navy }}>
            {ranges.length} range{ranges.length === 1 ? "" : "s"}
          </div>
        </div>

        <Link href="/dashboard/owner/horses/add" style={btn("primary")}>
          Add a horse →
        </Link>
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

      {/* Upcoming list */}
      <div style={{ marginTop: 16, ...sectionCard }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 950, color: palette.navy }}>Upcoming Unavailability</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.62)" }}>
              Blocks + approved bookings (next 10).
            </div>
          </div>

          <div style={{ fontSize: 13, color: "rgba(0,0,0,0.60)" }}>
            {ranges.length} total
          </div>
        </div>

        {!loading && !error && upcoming.length === 0 ? (
          <div style={{ marginTop: 12, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
            No upcoming blocks or approved bookings.
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {upcoming.map((r) => (
            <div
              key={`${r.kind}-${r.sourceId}`}
              style={{
                ...card,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,241,232,0.55) 140%)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <AvailabilityBadge label={r.kind === "blocked" ? "Blocked" : "Booking"} tone={r.kind === "blocked" ? "warn" : "info"} />
                  <div style={{ fontWeight: 950, fontSize: 14, color: palette.navy }}>
                    {r.startDate} → {r.endDate}
                  </div>
                </div>

                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.70)" }}>
                  <span style={{ fontWeight: 950, color: "rgba(0,0,0,0.84)" }}>
                    {horseNameById.get(r.horseId) ?? "Horse"}
                  </span>
                  {" — "}
                  {r.label}
                </div>
              </div>

              <Link href={`/dashboard/owner/horses/${r.horseId}/availability`} style={btn("secondary")}>
                Edit Availability
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}