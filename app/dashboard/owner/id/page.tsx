"use client";

import { useMemo, useState } from "react";
import DashboardShell from "./_components/DashboardShell";
import StatCard from "./_components/StatCard";
import RequestsTable, { RequestRow } from "./_components/RequestsTable";
import { useOwnerDashboardData } from "./_hooks/useOwnerDashboardData";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function OwnerDashboardPage() {
  const {
    loading,
    error,
    summary,
    requests,
    refresh,
    approve,
    reject,
    actionBusyById,
  } = useOwnerDashboardData();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  return (
    <DashboardShell
      title="Owner Dashboard"
      subtitle="Manage requests, track active borrows, and keep your stable updated."
      onRefresh={refresh}
      loading={loading}
    >
      {error && (
        <div style={styles.errorBox}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Something went wrong</div>
          <div style={{ opacity: 0.85 }}>{error}</div>
        </div>
      )}

      <div style={styles.statsRow}>
        <StatCard label="Total horses" value={summary.totalHorses} />
        <StatCard label="Pending requests" value={summary.pendingRequests} accent="amber" />
        <StatCard label="Approved requests" value={summary.approvedRequests} accent="green" />
        <StatCard label="Active borrows" value={summary.activeBorrows} accent="blue" />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionTitle}>Requests</div>
            <div style={styles.sectionSub}>
              Approve or reject requests quickly. Open a request to message the borrower.
            </div>
          </div>

          <div style={styles.filters}>
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

        <RequestsTable
          rows={filteredRequests as RequestRow[]}
          loading={loading}
          onApprove={approve}
          onReject={reject}
          actionBusyById={actionBusyById}
        />
      </div>
    </DashboardShell>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
    marginTop: 16,
  },
  section: {
    marginTop: 18,
    background: "#fff",
    border: "1px solid rgba(15, 23, 42, 0.10)",
    borderRadius: 14,
    overflow: "hidden",
  },
  sectionHeader: {
    padding: 16,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
    background: "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 100%)",
  },
  sectionTitle: { fontSize: 16, fontWeight: 800, letterSpacing: "-0.2px" },
  sectionSub: { marginTop: 6, fontSize: 13, color: "rgba(15,23,42,0.70)" },
  filters: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 160,
  },
  filterLabel: { fontSize: 12, fontWeight: 700, color: "rgba(15,23,42,0.70)" },
  select: {
    height: 36,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    padding: "0 10px",
    background: "white",
    outline: "none",
    cursor: "pointer",
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
