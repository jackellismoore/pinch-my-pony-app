"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import RequestsTable, { RequestRow } from "@/components/RequestsTable";
import { useOwnerDashboardData } from "@/dashboard/owner/hooks/useOwnerDashboardData";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function SummaryCard(props: { label: string; value: number; accent?: string }) {
  const { label, value, accent } = props;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(15,23,42,0.10)",
        borderRadius: 14,
        padding: 16,
        minWidth: 180,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.65)" }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 28,
          fontWeight: 900,
          color: accent || "rgba(15,23,42,0.92)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const {
    loading,
    error,
    summary,
    requests,
    refresh,
    approve,
    reject,
    remove,
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
      subtitle="Overview of your horses and borrow requests."
      onRefresh={refresh}
      loading={loading}
    >
      {error && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(220,38,38,0.35)",
            background: "rgba(220,38,38,0.06)",
            color: "rgba(127,29,29,1)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
          <div style={{ opacity: 0.85 }}>{error}</div>
        </div>
      )}

      {/* Summary */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <SummaryCard label="Total Horses" value={summary.totalHorses} />
        <SummaryCard
          label="Pending Requests"
          value={summary.pendingRequests}
          accent="#f59e0b"
        />
        <SummaryCard
          label="Approved Requests"
          value={summary.approvedRequests}
          accent="#16a34a"
        />
        <SummaryCard
          label="Active Borrows"
          value={summary.activeBorrows}
          accent="#2563eb"
        />
      </div>

      {/* Actions Row */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/owner/horses" style={{ textDecoration: "none" }}>
            <button
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid rgba(15,23,42,0.14)",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Manage Horses
            </button>
          </Link>

          <Link href="/dashboard/owner/requests" style={{ textDecoration: "none" }}>
            <button
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid rgba(15,23,42,0.14)",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              View All Requests
            </button>
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 180 }}>
          <label style={{ fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.70)" }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={{
              height: 36,
              borderRadius: 10,
              border: "1px solid rgba(15,23,42,0.14)",
              padding: "0 10px",
              background: "white",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests Preview */}
      <div
        style={{
          marginTop: 14,
          background: "#fff",
          border: "1px solid rgba(15,23,42,0.10)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <RequestsTable
          rows={filteredRequests as RequestRow[]}
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
