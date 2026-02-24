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
  is_active: boolean | null;
};

type RequestRow = {
  id: string;
  horse_id: string | null;
  borrower_id: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  message: string | null;
  created_at: string;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
};

function fmt(d: string | null) {
  if (!d) return "—";
  return String(d).slice(0, 10);
}

function nameFromProfile(p?: ProfileMini | null) {
  const dn = (p?.display_name ?? "").trim();
  const fn = (p?.full_name ?? "").trim();
  return dn || fn || "Borrower";
}

function pill(kind: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.10)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
    letterSpacing: 0.2,
  };

  if (kind === "approved" || kind === "accepted")
    return { ...base, background: "rgba(31,61,43,0.10)", color: palette.forest, border: "1px solid rgba(31,61,43,0.18)" };

  if (kind === "rejected")
    return { ...base, background: "rgba(220,0,0,0.08)", color: "rgba(160,0,0,0.95)", border: "1px solid rgba(220,0,0,0.18)" };

  if (kind === "pending")
    return { ...base, background: "rgba(200,162,77,0.16)", color: "rgba(110,75,0,0.95)", border: "1px solid rgba(200,162,77,0.28)" };

  return { ...base, background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.70)" };
}

const pageTitleRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const h1: React.CSSProperties = { margin: 0, fontSize: 28, letterSpacing: -0.3, color: palette.navy, fontWeight: 950 };

const subtitle: React.CSSProperties = { marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.62)", lineHeight: 1.6 };

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

const topActions: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" };

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

export default function OwnerRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [borrowersById, setBorrowersById] = useState<Record<string, ProfileMini>>({});

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

        // 1) load horses owned by user (this gives us the exact horse ids)
        const horsesRes = await supabase
          .from("horses")
          .select("id,name,is_active")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (horsesRes.error) throw horsesRes.error;

        const horseRows = (horsesRes.data ?? []) as HorseRow[];
        if (cancelled) return;
        setHorses(horseRows);

        const horseIds = horseRows.map((h) => h.id);
        if (horseIds.length === 0) {
          setRequests([]);
          setBorrowersById({});
          setLoading(false);
          return;
        }

        // 2) load requests by horse_id (NO EMBEDS — avoids relationship ambiguity)
        const reqRes = await supabase
          .from("borrow_requests")
          .select("id,horse_id,borrower_id,status,start_date,end_date,message,created_at")
          .in("horse_id", horseIds)
          .order("created_at", { ascending: false });

        if (reqRes.error) throw reqRes.error;

        const reqRows = (reqRes.data ?? []) as RequestRow[];
        if (cancelled) return;
        setRequests(reqRows);

        // 3) borrower names
        const borrowerIds = Array.from(new Set(reqRows.map((r) => r.borrower_id).filter(Boolean))) as string[];
        if (borrowerIds.length > 0) {
          const profRes = await supabase.from("profiles").select("id,display_name,full_name").in("id", borrowerIds);
          if (!cancelled && !profRes.error) {
            const map: Record<string, ProfileMini> = {};
            for (const p of (profRes.data ?? []) as ProfileMini[]) map[p.id] = p;
            setBorrowersById(map);
          }
        } else {
          setBorrowersById({});
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const horseNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of horses) m.set(h.id, h.name ?? "Horse");
    return m;
  }, [horses]);

  const pending = useMemo(() => requests.filter((r) => (r.status ?? "pending") === "pending"), [requests]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={pageTitleRow}>
        <div>
          <h1 style={h1}>Owner Requests</h1>
          <div style={subtitle}>Approve/reject pending requests. View details to message the borrower.</div>
        </div>

        <div style={topActions}>
          <Link href="/dashboard/owner" style={btn("secondary")}>
            ← Overview
          </Link>
          <Link href="/dashboard/owner/horses" style={btn("primary")}>
            Manage Horses →
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

      <div style={{ marginTop: 16, ...sectionCard }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 950, color: palette.navy }}>Incoming requests</div>
          <div style={{ fontSize: 13, color: "rgba(0,0,0,0.60)" }}>
            {pending.length} pending • {requests.length} total
          </div>
        </div>

        {!loading && !error && requests.length === 0 ? (
          <div style={{ marginTop: 12, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>No requests yet.</div>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {requests.map((r) => {
            const status = String(r.status ?? "pending");
            const horseName = r.horse_id ? horseNameById.get(r.horse_id) ?? "Horse" : "Horse";
            const borrowerName = r.borrower_id ? nameFromProfile(borrowersById[r.borrower_id]) : "Borrower";

            return (
              <div
                key={r.id}
                style={{
                  ...card,
                  padding: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(245,241,232,0.55) 140%)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 950, fontSize: 15, color: palette.navy }}>{horseName}</div>
                    <span style={pill(status)}>{status.toUpperCase()}</span>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.70)" }}>
                    Borrower: <span style={{ fontWeight: 900, color: "rgba(0,0,0,0.85)" }}>{borrowerName}</span>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.70)" }}>
                    Dates:{" "}
                    <span style={{ fontWeight: 900, color: "rgba(0,0,0,0.85)" }}>
                      {fmt(r.start_date)} → {fmt(r.end_date)}
                    </span>
                  </div>
                </div>

                <Link href={`/dashboard/owner/${r.id}`} style={btn("secondary")}>
                  View →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}