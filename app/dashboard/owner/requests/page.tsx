"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import RequestsTable from "@/components/RequestsTable";

type RequestRow = {
  id: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  message?: string | null;

  horse_id?: string | null;
  borrower_id?: string | null;

  // joins (optional)
  horse?: { id?: string; name?: string | null } | null;
  borrower?: { id?: string; display_name?: string | null; full_name?: string | null } | null;
};

function pageWrap(): React.CSSProperties {
  return { padding: 16, maxWidth: 1100, margin: "0 auto" };
}

function topBar(): React.CSSProperties {
  return { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" };
}

function h1Style(): React.CSSProperties {
  return { margin: 0, fontSize: 22, fontWeight: 950 };
}

function subStyle(): React.CSSProperties {
  return { marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)" };
}

function btn(kind: "primary" | "secondary"): React.CSSProperties {
  const base: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.14)",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 950,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    whiteSpace: "nowrap",
  };
  if (kind === "primary") return { ...base, background: "black", color: "white" };
  return { ...base, background: "white", color: "black" };
}

export default function OwnerRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<RequestRow[]>([]);

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
        if (!user) throw new Error("Not authenticated.");

        // Pull requests for horses owned by me.
        // This assumes borrow_requests has horse_id + borrower_id and RLS allows owner to read.
        // We fetch horses separately to filter by owner_id safely if needed.
        const { data: myHorses, error: horsesErr } = await supabase
          .from("horses")
          .select("id")
          .eq("owner_id", user.id);

        if (horsesErr) throw horsesErr;

        const horseIds = (myHorses ?? []).map((h: any) => h.id).filter(Boolean);

        if (horseIds.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        // Requests + joins for display (horse name + borrower label)
        const { data: reqData, error: reqErr } = await supabase
          .from("borrow_requests")
          .select(
            `
            id,status,start_date,end_date,message,horse_id,borrower_id,
            horse:horses(id,name),
            borrower:profiles(id,display_name,full_name)
          `
          )
          .in("horse_id", horseIds)
          .order("created_at", { ascending: false });

        if (reqErr) throw reqErr;

        if (!cancelled) setRows((reqData ?? []) as RequestRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load owner requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const subtitle = useMemo(() => {
    if (loading) return "Loading your incoming requests…";
    if (rows.length === 0) return "No requests yet.";
    return "Review incoming requests and approve or reject.";
  }, [loading, rows.length]);

  return (
    <div style={pageWrap()}>
      <div style={topBar()}>
        <div>
          <h1 style={h1Style()}>Owner Requests</h1>
          <div style={subStyle()}>{subtitle}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/dashboard/owner" style={btn("secondary")}>
            ← Overview
          </Link>
          <Link href="/dashboard/owner/horses" style={btn("primary")}>
            Manage Horses →
          </Link>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.06)",
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <RequestsTable
          mode="owner"
          title="Incoming requests"
          subtitle="Approve/reject pending requests. View details to message the borrower."
          loading={loading}
          requests={rows}
          emptyLabel="No requests yet."
        />
      </div>

      {/* subtle spacing */}
      <div style={{ height: 18 }} />
    </div>
  );
}