"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardShell from "@/components/DashboardShell";
import StatusPill from "@/components/StatusPill";
import { useOwnerRequestDetail } from "@/dashboard/owner/hooks/useOwnerRequestDetail";

function isActiveApproved(detail: {
  status: string;
  start_date: string | null;
  end_date: string | null;
}) {
  if (detail.status !== "approved") return false;
  if (!detail.start_date || !detail.end_date) return false;
  const now = new Date();
  const start = new Date(detail.start_date);
  const end = new Date(detail.end_date);
  return start <= now && now <= end;
}

export default function OwnerRequestDetailPage({
  params,
}: {
  params: { requestId: string };
}) {
  const router = useRouter();
  const requestId = params.requestId;

  const { loading, error, detail, refresh, setDetail } =
    useOwnerRequestDetail(requestId);

  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const approve = async () => {
    if (!detail || detail.status !== "pending") return;

    const ok = confirm("Approve this request?");
    if (!ok) return;

    setLocalError(null);
    setBusy(true);

    setDetail((prev) => (prev ? { ...prev, status: "approved" } : prev));

    const { error } = await supabase
      .from("borrow_requests")
      .update({ status: "approved" })
      .eq("id", requestId);

    if (error) {
      setLocalError(error.message);
      setDetail((prev) => (prev ? { ...prev, status: "pending" } : prev));
      setBusy(false);
      return;
    }

    setBusy(false);
    router.push(`/messages/${requestId}`);
    router.refresh();
  };

  const reject = async () => {
    if (!detail || detail.status !== "pending") return;

    const ok = confirm("Reject this request?");
    if (!ok) return;

    setLocalError(null);
    setBusy(true);

    setDetail((prev) => (prev ? { ...prev, status: "rejected" } : prev));

    const { error } = await supabase
      .from("borrow_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      setLocalError(error.message);
      setDetail((prev) => (prev ? { ...prev, status: "pending" } : prev));
      setBusy(false);
      return;
    }

    setBusy(false);
  };

  const remove = async () => {
    if (!detail) return;

    if (isActiveApproved(detail)) {
      alert("You cannot delete an active approved borrow.");
      return;
    }

    const ok = confirm(
      "Delete this request? This cannot be undone. The message thread will also disappear."
    );
    if (!ok) return;

    setLocalError(null);
    setBusy(true);

    setDetail(null);

    const { error: delErr } = await supabase
      .from("borrow_requests")
      .delete()
      .eq("id", requestId);

    if (delErr) {
      setLocalError(delErr.message);
      await refresh();
      setBusy(false);
      return;
    }

    setBusy(false);
    router.push("/dashboard/owner/requests");
    router.refresh();
  };

  return (
    <DashboardShell
      title="Request Details"
      subtitle="Review request info and take action."
      onRefresh={refresh}
      loading={loading}
    >
      <div style={styles.topRow}>
        <button onClick={() => router.back()} style={styles.secondaryBtn}>
          ← Back
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/messages/${requestId}`} style={{ textDecoration: "none" }}>
            <button style={styles.primaryBtn}>Open Messages</button>
          </Link>

          <Link href="/dashboard/owner/requests" style={{ textDecoration: "none" }}>
            <button style={styles.secondaryBtn}>All Requests</button>
          </Link>

          <button
            onClick={remove}
            disabled={busy}
            style={{ ...styles.deleteBtn, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "…" : "Delete"}
          </button>
        </div>
      </div>

      {(error || localError) && (
        <div style={styles.errorBox}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
          <div style={{ opacity: 0.85 }}>{localError || error}</div>
        </div>
      )}

      {loading && !detail && <div style={{ padding: 16 }}>Loading…</div>}

      {!loading && !detail && !error && !localError && (
        <div style={{ padding: 16 }}>
          This request is not available (it may have been deleted).
        </div>
      )}

      {detail && (
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Request</div>

            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <StatusPill status={detail.status} />
              <div style={styles.meta}>#{detail.id.slice(0, 8)}</div>
            </div>

            <div style={styles.row}>
              <div style={styles.label}>Borrower</div>
              <div style={styles.value}>
                {detail.borrower?.display_name ||
                  detail.borrower?.full_name ||
                  "Unknown"}
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.label}>Horse</div>
              <div style={styles.value}>{detail.horse?.name || "Unknown horse"}</div>
            </div>

            <div style={styles.row}>
              <div style={styles.label}>Dates</div>
              <div style={styles.value}>
                {detail.start_date ? new Date(detail.start_date).toLocaleDateString() : "—"}{" "}
                <span style={{ opacity: 0.5 }}>→</span>{" "}
                {detail.end_date ? new Date(detail.end_date).toLocaleDateString() : "—"}
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.label}>Created</div>
              <div style={styles.value}>{new Date(detail.created_at).toLocaleString()}</div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={styles.label}>Message</div>
              <div style={styles.messageBox}>
                {detail.message?.trim() ? detail.message : "No message."}
              </div>
            </div>

            {detail.status === "pending" && (
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={approve}
                  disabled={busy}
                  style={{ ...styles.approveBtn, opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? "…" : "Approve"}
                </button>

                <button
                  onClick={reject}
                  disabled={busy}
                  style={{ ...styles.rejectBtn, opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? "…" : "Reject"}
                </button>
              </div>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Quick Actions</div>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href={`/messages/${requestId}`} style={{ textDecoration: "none" }}>
                <button style={styles.secondaryBtnWide}>Open Messages</button>
              </Link>

              <button onClick={refresh} style={styles.secondaryBtnWide}>
                Refresh
              </button>

              <button
                onClick={remove}
                disabled={busy}
                style={{ ...styles.deleteBtnWide, opacity: busy ? 0.7 : 1 }}
              >
                {busy ? "…" : "Delete Request"}
              </button>
            </div>
          </div>
        </div>
      )}
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
  grid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
    gap: 14,
  },
  card: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 900,
    color: "rgba(15,23,42,0.80)",
  },
  row: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "120px minmax(0, 1fr)",
    gap: 10,
    alignItems: "start",
  },
  label: { fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.65)" },
  value: { fontSize: 13, fontWeight: 800, color: "rgba(15,23,42,0.90)" },
  meta: { fontSize: 12, color: "rgba(15,23,42,0.60)", fontWeight: 800 },
  messageBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "rgba(248,250,252,1)",
    color: "rgba(15,23,42,0.85)",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  primaryBtn: {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    background: "#2563eb",
    color: "white",
    border: "none",
    fontWeight: 900,
    cursor: "pointer",
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
  secondaryBtnWide: {
    height: 38,
    width: "100%",
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "white",
    cursor: "pointer",
    fontWeight: 900,
  },
  approveBtn: {
    height: 38,
    padding: "0 14px",
    borderRadius: 10,
    border: "none",
    background: "#16a34a",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  rejectBtn: {
    height: 38,
    padding: "0 14px",
    borderRadius: 10,
    border: "none",
    background: "#dc2626",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  deleteBtn: {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "rgba(15,23,42,0.08)",
    cursor: "pointer",
    fontWeight: 900,
    color: "rgba(15,23,42,0.92)",
  },
  deleteBtnWide: {
    height: 38,
    width: "100%",
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "rgba(15,23,42,0.08)",
    cursor: "pointer",
    fontWeight: 900,
    color: "rgba(15,23,42,0.92)",
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
