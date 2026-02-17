"use client";

import Link from "next/link";
import StatusPill from "./StatusPill";
import type { OwnerRequestRow } from "../_hooks/useOwnerDashboardData";

export type RequestRow = OwnerRequestRow;

export default function RequestsTable(props: {
  rows: RequestRow[];
  loading: boolean;
  onApprove: (row: RequestRow) => void;
  onReject: (row: RequestRow) => void;
  actionBusyById: Record<string, boolean>;
}) {
  const { rows, loading, onApprove, onReject, actionBusyById } = props;

  if (loading && rows.length === 0) {
    return <div style={styles.empty}>Loading requests…</div>;
  }

  if (!loading && rows.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>No requests found</div>
        <div style={{ color: "rgba(15,23,42,0.65)", fontSize: 13 }}>
          When someone requests to borrow one of your horses, it will appear here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Horse</th>
            <th style={styles.th}>Borrower</th>
            <th style={styles.th}>Dates</th>
            <th style={styles.th}>Status</th>
            <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const busy = !!actionBusyById[r.id];
            const borrowerName = r.borrower?.display_name || r.borrower?.full_name || "Unknown";
            const horseName = r.horse?.name || "Unnamed horse";

            return (
              <tr key={r.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 800 }}>{horseName}</div>
                  <div style={styles.meta}>Request #{r.id.slice(0, 8)}</div>
                </td>

                <td style={styles.td}>
                  <div style={{ fontWeight: 800 }}>{borrowerName}</div>
                  <div style={styles.meta}>{r.message ? r.message.slice(0, 60) : "No message"}</div>
                </td>

                <td style={styles.td}>
                  <div style={{ fontWeight: 800 }}>
                    {r.start_date ? new Date(r.start_date).toLocaleDateString() : "—"}{" "}
                    <span style={{ opacity: 0.5 }}>→</span>{" "}
                    {r.end_date ? new Date(r.end_date).toLocaleDateString() : "—"}
                  </div>
                  <div style={styles.meta}>
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </td>

                <td style={styles.td}>
                  <StatusPill status={r.status} />
                </td>

                <td style={{ ...styles.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <Link href={`/messages/${r.id}`} style={styles.linkBtn}>
                    Open
                  </Link>

                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => onApprove(r)}
                        style={{ ...styles.actionBtn, ...styles.approveBtn }}
                        disabled={busy}
                      >
                        {busy ? "…" : "Approve"}
                      </button>
                      <button
                        onClick={() => onReject(r)}
                        style={{ ...styles.actionBtn, ...styles.rejectBtn }}
                        disabled={busy}
                      >
                        {busy ? "…" : "Reject"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  empty: { padding: 16 },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  th: {
    textAlign: "left",
    fontSize: 12,
    fontWeight: 800,
    color: "rgba(15,23,42,0.70)",
    padding: "12px 16px",
    background: "rgba(248,250,252,1)",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
  },
  tr: {
    background: "white",
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
    verticalAlign: "top",
  },
  meta: { marginTop: 6, fontSize: 12, color: "rgba(15,23,42,0.60)" },
  linkBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    padding: "0 10px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "white",
    fontWeight: 800,
    fontSize: 13,
    marginRight: 8,
    textDecoration: "none",
    color: "rgba(15,23,42,0.92)",
  },
  actionBtn: {
    height: 34,
    padding: "0 10px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
    marginRight: 8,
  },
  approveBtn: { background: "#16a34a", color: "white" },
  rejectBtn: { background: "#dc2626", color: "white", marginRight: 0 },
};
