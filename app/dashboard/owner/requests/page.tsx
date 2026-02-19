"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { supabase } from "@/lib/supabaseClient";

type Status = "pending" | "approved" | "rejected";
type StatusFilter = "all" | Status;

type Row = {
  id: string;
  horse_id: string;
  borrower_id: string;
  start_date: string | null;
  end_date: string | null;
  status: Status;
  created_at: string | null;

  horse_name: string | null;
  borrower_name: string | null;
};

function chip(active: boolean): React.CSSProperties {
  return {
    border: "1px solid rgba(15,23,42,0.14)",
    borderRadius: 999,
    padding: "8px 10px",
    fontSize: 13,
    fontWeight: 950,
    background: active ? "#0f172a" : "white",
    color: active ? "white" : "#0f172a",
    cursor: "pointer",
  };
}

function statusPill(status: Status): React.CSSProperties {
  if (status === "approved")
    return { background: "rgba(34,197,94,0.12)", color: "#15803d", border: "1px solid rgba(34,197,94,0.22)" };
  if (status === "rejected")
    return { background: "rgba(239,68,68,0.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.22)" };
  return { background: "rgba(245,158,11,0.14)", color: "#92400e", border: "1px solid rgba(245,158,11,0.24)" };
}

export default function OwnerRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");

  async function load() {
    setLoading(true);
    setError(null);

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      // my horses
      const { data: horses, error: hErr } = await supabase.from("horses").select("id,name").eq("owner_id", uid);
      if (hErr) throw hErr;

      const horseIds = (horses ?? []).map((h: any) => h.id).filter(Boolean);
      const horseNameById: Record<string, string> = {};
      for (const h of horses ?? []) horseNameById[h.id] = h.name ?? "Horse";

      if (!horseIds.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: reqs, error: rErr } = await supabase
        .from("borrow_requests")
        .select("id,horse_id,borrower_id,start_date,end_date,status,created_at")
        .in("horse_id", horseIds)
        .order("created_at", { ascending: false });

      if (rErr) throw rErr;

      const borrowerIds = Array.from(new Set((reqs ?? []).map((r: any) => r.borrower_id).filter(Boolean)));

      const { data: profs } = borrowerIds.length
        ? await supabase.from("profiles").select("id,display_name,full_name").in("id", borrowerIds)
        : ({ data: [] } as any);

      const borrowerNameById: Record<string, string> = {};
      for (const p of profs ?? []) {
        const dn = (p.display_name ?? "").trim();
        const fn = (p.full_name ?? "").trim();
        borrowerNameById[p.id] = dn || fn || "Borrower";
      }

      const mapped: Row[] = (reqs ?? []).map((r: any) => ({
        ...r,
        horse_name: horseNameById[r.horse_id] ?? "Horse",
        borrower_name: borrowerNameById[r.borrower_id] ?? "Borrower",
      }));

      setRows(mapped);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load requests.");
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    load();

    const ch = supabase
      .channel("rt:owner_requests_page")
      .on("postgres_changes", { event: "*", schema: "public", table: "borrow_requests" }, () => mounted && load())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  return (
    <DashboardShell>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>Requests</h1>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
          Manage incoming borrow requests. Click a row to open the request thread.
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={chip(filter === "all")}>
            All
          </button>
          <button onClick={() => setFilter("pending")} style={chip(filter === "pending")}>
            Pending
          </button>
          <button onClick={() => setFilter("approved")} style={chip(filter === "approved")}>
            Approved
          </button>
          <button onClick={() => setFilter("rejected")} style={chip(filter === "rejected")}>
            Rejected
          </button>
        </div>

        {loading ? <div style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>Loading…</div> : null}

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

        <div
          style={{
            marginTop: 14,
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 16,
            background: "white",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, fontWeight: 950 }}>Borrow requests</div>

          {filtered.length === 0 ? (
            <div style={{ padding: 14, fontSize: 13, opacity: 0.7 }}>No requests.</div>
          ) : (
            <div style={{ display: "grid" }}>
              {filtered.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/owner/${r.id}`}
                  style={{
                    textDecoration: "none",
                    color: "#0f172a",
                    padding: 14,
                    borderTop: "1px solid rgba(15,23,42,0.08)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 950 }}>{r.horse_name}</div>
                    <span
                      style={{
                        ...statusPill(r.status),
                        fontSize: 12,
                        fontWeight: 950,
                        padding: "6px 10px",
                        borderRadius: 999,
                      }}
                    >
                      {r.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    Borrower: <span style={{ fontWeight: 900 }}>{r.borrower_name}</span>
                  </div>

                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    Dates:{" "}
                    <span style={{ fontWeight: 900 }}>
                      {r.start_date ?? "—"} → {r.end_date ?? "—"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
