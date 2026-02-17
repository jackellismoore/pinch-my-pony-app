"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import StatusPill from "@/components/StatusPill";

type RequestRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  horse: { id: string; name: string | null } | null;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "—";
  }
}

export default function BorrowerDashboard() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    load();
  }, []);

  const setBusy = (id: string, busy: boolean) => {
    setBusyById((prev) => ({ ...prev, [id]: busy }));
  };

  const load = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setError("Not logged in.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("borrow_requests")
      .select(
        `
        id,
        status,
        created_at,
        start_date,
        end_date,
        horse:horses!borrow_requests_horse_id_fkey ( id, name )
      `
      )
      .eq("borrower_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setRequests((data ?? []).map((r: any) => ({
  id: r.id,
  status: r.status,
  created_at: r.created_at,
  start_date: r.start_date,
  end_date: r.end_date,
  horse: r.horse ?? null,
})));

    setLoading(false);
  };

  const cancelRequest = async (row: RequestRow) => {
    if (row.status !== "pending") return;

    const ok = confirm("Cancel this request? This cannot be undone.");
    if (!ok) return;

    setBusy(row.id, true);
    setError(null);

    // Optimistic remove
    const prev = requests;
    setRequests((cur) => cur.filter((r) => r.id !== row.id));

    // If you prefer soft-cancel, we can add status="cancelled" later, but your DB constraint doesn’t allow it.
    const { error } = await supabase.from("borrow_requests").delete().eq("id", row.id);

    if (error) {
      // rollback
      setRequests(prev);
      setError(error.message);
      setBusy(row.id, false);
      return;
    }

    setBusy(row.id, false);
  };

  const summary = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [requests]);

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Borrower Dashboard</h1>
          <p style={styles.subtitle}>Manage your borrow requests and conversations.</p>
        </div>

        <div style={styles.headerActions}>
          <Link href="/messages" style={{ textDecoration: "none" }}>
            <button style={styles.secondaryBtn}>Messages</button>
          </Link>
          <Link href="/browse" style={{ textDecoration: "none" }}>
            <button style={styles.primaryBtn}>Browse Horses</button>
          </Link>
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={styles.statsRow}>
        <StatCard label="Total Requests" value={summary.total} />
        <StatCard label="Pending" value={summary.pending} accent="amber" />
        <StatCard label="Approved" value={summary.approved} accent="green" />
        <StatCard label="Rejected" value={summary.rejected} accent="red" />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>My Requests</div>
          <button onClick={load} style={styles.ghostBtn}>
            Refresh
          </button>
        </div>

        {requests.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>No requests yet</div>
            <div style={{ opacity: 0.75 }}>
              Browse horses and send a request to get started.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Horse</th>
                  <th style={styles.th}>Dates</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const busy = !!busyById[r.id];
                  return (
                    <tr key={r.id}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 900 }}>{r.horse?.name || "Unknown"}</div>
                        <div style={styles.meta}>Request #{r.id.slice(0, 8)}</div>
                      </td>

                      <td style={styles.td}>
                        {formatDate(r.start_date)} → {formatDate(r.end_date)}
                      </td>

                      <td style={styles.td}>
                        <StatusPill status={r.status} />
                      </td>

                      <td style={styles.td}>
                        {new Date(r.created_at).toLocaleString()}
                      </td>

                      <td style={{ ...styles.td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <Link href={`/messages/${r.id}`} style={{ textDecoration: "none" }}>
                          <button style={styles.secondaryBtnSmall}>Open Messages</button>
                        </Link>

                        {r.status === "pending" && (
                          <button
                            onClick={() => cancelRequest(r)}
                            disabled={busy}
                            style={{
                              ...styles.dangerBtnSmall,
                              opacity: busy ? 0.7 : 1,
                              cursor: busy ? "not-allowed" : "pointer",
                            }}
                          >
                            {busy ? "…" : "Cancel"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "green" | "red";
}) {
  const accentColors: Record<string, string> = {
    amber: "#f59e0b",
    green: "#16a34a",
    red: "#dc2626",
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div
        style={{
          ...styles.cardValue,
          color: accent ? accentColors[accent] : "#111",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 40, maxWidth: 1200, margin: "0 auto" },

  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  headerActions: { display: "flex", gap: 10 },

  title: { fontSize: 24, fontWeight: 900, margin: 0 },
  subtitle: { marginTop: 8, opacity: 0.72, marginBottom: 0 },

  errorBox: {
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
    background: "rgba(220,38,38,0.08)",
    border: "1px solid rgba(220,38,38,0.25)",
    color: "rgba(127,29,29,1)",
  },

  statsRow: { display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" },

  card: {
    background: "#fff",
    padding: 18,
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.10)",
    minWidth: 170,
  },
  cardLabel: { fontSize: 12, opacity: 0.7, fontWeight: 800 },
  cardValue: { fontSize: 26, fontWeight: 900, marginTop: 6 },

  section: {
    marginTop: 30,
    background: "#fff",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.10)",
    padding: 20,
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionTitle: { fontWeight: 900 },

  table: { width: "100%", borderCollapse: "collapse" },

  th: {
    textAlign: "left",
    fontSize: 12,
    opacity: 0.7,
    paddingBottom: 10,
  },

  td: {
    padding: "12px 0",
    borderTop: "1px solid rgba(15,23,42,0.08)",
    verticalAlign: "top",
  },

  meta: { marginTop: 6, fontSize: 12, opacity: 0.65 },

  primaryBtn: {
    padding: "10px 14px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryBtn: {
    padding: "10px 14px",
    background: "white",
    border: "1px solid rgba(15,23,42,0.14)",
    borderRadius: 10,
    fontWeight: 900,
    cursor: "pointer",
    color: "rgba(15,23,42,0.92)",
  },

  secondaryBtnSmall: {
    padding: "8px 12px",
    background: "white",
    border: "1px solid rgba(15,23,42,0.14)",
    borderRadius: 8,
    fontWeight: 900,
    cursor: "pointer",
    marginRight: 8,
  },

  dangerBtnSmall: {
    padding: "8px 12px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontWeight: 900,
  },

  ghostBtn: {
    padding: "8px 12px",
    background: "transparent",
    border: "1px solid rgba(15,23,42,0.14)",
    borderRadius: 8,
    fontWeight: 900,
    cursor: "pointer",
  },

  empty: { padding: 18, opacity: 0.8 },
};
