"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";

const palette = {
  forest: "#1F3D2B",
  navy: "#1F2A44",
};

type HorseRow = {
  id: string;
  name: string | null;
};

type BlockRow = {
  id: string;
  horse_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
};

type BookingRow = {
  id: string;
  horse_id: string;
  start_date: string;
  end_date: string;
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

export default function OwnerDashboardPage() {
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
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const { data: horsesData } = await supabase
        .from("horses")
        .select("id,name")
        .eq("owner_id", user.id);

      if (cancelled) return;

      const horseRows = (horsesData ?? []) as HorseRow[];
      setHorses(horseRows);

      const horseIds = horseRows.map((h) => h.id);
      if (horseIds.length === 0) {
        setLoading(false);
        return;
      }

      const today = todayISODate();

      const [blocksRes, bookingsRes] = await Promise.all([
        supabase
          .from("horse_unavailability")
          .select("id,horse_id,start_date,end_date,reason")
          .in("horse_id", horseIds)
          .gte("end_date", today),

        supabase
          .from("borrow_requests")
          .select("id,horse_id,start_date,end_date")
          .in("horse_id", horseIds)
          .eq("status", "approved")
          .gte("end_date", today),
      ]);

      if (cancelled) return;

      const blocks = (blocksRes.data ?? []) as BlockRow[];
      const bookings = (bookingsRes.data ?? []) as BookingRow[];

      const unified: UnifiedRange[] = [
        ...blocks.map((b) => ({
          kind: "blocked" as const,
          horseId: b.horse_id,
          startDate: b.start_date,
          endDate: b.end_date,
          label: b.reason ?? "Blocked",
          sourceId: b.id,
        })),
        ...bookings.map((b) => ({
          kind: "booking" as const,
          horseId: b.horse_id,
          startDate: b.start_date,
          endDate: b.end_date,
          label: "Approved booking",
          sourceId: b.id,
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
    horses.forEach((h) => map.set(h.id, h.name ?? "Horse"));
    return map;
  }, [horses]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, color: palette.navy }}>
        Owner Overview
      </h1>

      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
        Upcoming blocks and approved bookings.
      </div>

      {loading && <div style={{ marginTop: 16 }}>Loading…</div>}

      {error && (
        <div style={{ marginTop: 16, color: "red" }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
        {ranges.length === 0 && !loading && (
          <div style={{ opacity: 0.7 }}>No upcoming activity.</div>
        )}

        {ranges.map((r) => (
          <div
            key={r.sourceId}
            style={{
              borderRadius: 20,
              border: "1px solid rgba(0,0,0,0.08)",
              padding: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <AvailabilityBadge
                label={r.kind === "blocked" ? "Blocked" : "Booking"}
                tone={r.kind === "blocked" ? "warn" : "info"}
              />

              <div style={{ marginTop: 8, fontWeight: 800 }}>
                {horseNameById.get(r.horseId)}
              </div>

              <div style={{ marginTop: 4, fontSize: 13, opacity: 0.7 }}>
                {r.startDate} → {r.endDate}
              </div>
            </div>

            <Link
              href={`/dashboard/owner/horses/${r.horseId}/availability`}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Edit
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}