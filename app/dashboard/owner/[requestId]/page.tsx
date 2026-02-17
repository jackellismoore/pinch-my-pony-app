"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardShell from "@/components/DashboardShell";
import StatusPill from "@/components/StatusPill";
import { useOwnerRequestDetail } from "@/dashboard/owner/hooks/useOwnerRequestDetail";
import { useState } from "react";

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
    setLocalError(null);

    const ok = confirm("Approve this request?");
    if (!ok) return;

    setBusy(true);

    // optimistic
    setDetail((prev) => (prev ? { ...prev, status: "approved" } : prev));

    const { error } = await supabase
      .from("borrow_requests")
      .update({ status: "approved" })
      .eq("id", requestId);

    if (error) {
      setLocalError(error.message);
      // rollback
      setDetail((prev) => (prev ? { ...prev, status: "pending" } : prev));
      setBusy(false);
      return;
    }

    setBusy(false);
  };

  const reject = async () => {
    if (!detail || detail.status !== "pending") return;
    setLocalError(null);

    const ok = confirm("Reject this request?");
    if (!ok) return;

    setBusy(true);

    // optimistic
    setDetail((prev) => (prev ? { ...prev, status: "rejected" } : prev));

    const { error } = await supabase
      .from("borrow_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      setLocalError(error.message);
      // rollback
      setDetail((prev) => (prev ? { ...prev, status: "pending" } : prev));
      setBusy(false);
      return;
    }

    setBusy(false);
  };

  return (
    <DashboardShell
      title="Request Details"
      subtitle="Review request info and take action. Messaging remains tied to this request."
      onRefresh={refresh}
      loading={loading}
    >
      <div style={styles.topRow}>
        <Link href="/dashboard/owner/requests" style={{ textDecoration: "none" }}>
          <button style={styles.secondaryBtn}>← Back to Requests</button>
        </Link>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/messages/${requestId}`} style={{ textDecoration: "none" }}>
            <button style={styles.primaryBtn}>Open Messages</button>
          </Link>

          <button
            onClick={() => router.push("/dashboard/owner")}
            style={styles.secondaryBtn}
          >
            Dashboard
          </button>
        </div>
      </div>

      {(error || localError) && (
        <div style={styles.errorBox}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Couldn’t load</div>
          <div style={{ opacity: 0.85 }}>{localError || error}</div>
        </div>
      )}

      {loading && !detail && <div style={{ padding: 16 }}>Loading…</div>}

      {detail && (
        <div style={styles.grid}>
          {/* Left: Request Info */}
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

          {/* Right: Horse Preview */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Horse</div>

            {detail.horse?.image_url ? (
              <img
                src={detail.horse.image_url}
                alt={detail.horse.name ?? "Horse"}
                style={styles.horseImg}
              />
            ) : (
              <div style={styles.horseImgPlaceholder}>No photo</div>
            )}

            <div style={{ marginTop: 12, fontWeight: 900 }}>
              {detail.horse?.name || "Unnamed horse"}
            </div>

            {detail.horse?.location && (
              <div style={{ marginTop: 6, color: "rgba(15,23,42,0.70)" }}>
                {detail.horse.location}
              </div>
            )}
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
  horseImg: {
    marginTop: 12,
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.10)",
  },
  horseImgPlaceholder: {
    marginTop: 12,
    width: "100%",
    height: 220,
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "rgba(248,250,252,1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(15,23,42,0.55)",
    fontWeight: 900,
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
  errorBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    border: "1px solid rgba(220,38,38,0.35)",
    background: "rgba(220,38,38,0.06)",
    color: "rgba(127,29,29,1)",
  },
};
