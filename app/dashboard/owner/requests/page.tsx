"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import RequestsTable, { RequestRow } from "@/components/RequestsTable";
import { useOwnerDashboardData } from "@/dashboard/owner/hooks/useOwnerDashboardData";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function OwnerRequestsPage() {
  const {
    loading,
    error,
    requests,
    refresh,
    approve,
    reject,
    remove,
    actionBusyById,
  } = useOwnerDashboardData();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  return (
    <DashboardShell
      title="Owner Requests"
      subtitle="Review requests, approve/reject, delete, and open message threads."
      onRefresh={refresh}
      loading={loading}
    >
      <div style={styles.topRow}>
        <Link href="/dashboard/owner" style={{ textDecoration: "none" }}>
          <button style={styles.secondaryBtn}>← Back to Dashboard</button>
        </Link>

        <div style={styles.filterWrap}>
          <label style={styles.filterLabel}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={styles.select}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Couldn’t load</div>
          <div style={{ opacity: 0.85 }}>{error}</div>
        </div>
      )}

      <div style={styles.section}>
        <RequestsTable
          rows={filtered as RequestRow[]}
          loading={loading}
          onApprove={approve}
          onReject={reject}
          onDelete={remove}
          actionBusyById={actionBusyById}
        />
      </div>
    </DashboardShell>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topRow: {
    marginTop: 14,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  filterWrap: { display: "flex", flexDirection: "column", gap: 6, minWidth: 180 },
  filterLabel: { fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.70)" },
  select: {
    height: 36,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    padding: "0 10px",
    background: "white",
    outline: "none",
    cursor: "pointer",
  },
  section: {
    marginTop: 14,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    overflow: "hidden",
  },
  secondaryBtn: {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "white",
    cursor: "pointer",
    fontWeight: 900,
  },
  errorBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    border: "1px solid rgba(220,38,38,0.35)",
    background: "rgba(220,38,38,0.06)",
    color: "rgba(127,29,29,1)",
  },
};
