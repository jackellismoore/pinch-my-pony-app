"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type RequestDetail = {
  id: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  message: string | null;
  horse_id: string | null;
  borrower_id: string | null;

  horse?: { id?: string; name?: string | null; owner_id?: string | null } | null;
  borrower?: { id?: string; display_name?: string | null; full_name?: string | null } | null;
};

function pageWrap(): React.CSSProperties {
  return { padding: 16, maxWidth: 1100, margin: "0 auto" };
}

function btn(kind: "primary" | "secondary" | "danger"): React.CSSProperties {
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
    cursor: "pointer",
    background: "white",
    color: "black",
  };

  if (kind === "primary") return { ...base, background: "black", color: "white" };

  if (kind === "danger")
    return {
      ...base,
      border: "1px solid rgba(200,0,0,0.25)",
      color: "rgba(170,0,0,0.95)",
      background: "white",
    };

  return base;
}

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 14,
    padding: 14,
    background: "white",
  };
}

function pill(kind: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.10)",
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  };
  if (kind === "approved" || kind === "accepted") return { ...base, background: "rgba(0,160,60,0.10)", color: "rgba(0,120,45,0.95)" };
  if (kind === "rejected") return { ...base, background: "rgba(220,0,0,0.08)", color: "rgba(170,0,0,0.95)" };
  if (kind === "pending") return { ...base, background: "rgba(255,180,0,0.14)", color: "rgba(125,80,0,0.95)" };
  return { ...base, background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.70)" };
}

function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return String(d).slice(0, 10);
  } catch {
    return d;
  }
}

function pickBorrowerName(r: RequestDetail | null) {
  const dn = (r?.borrower?.display_name ?? "").trim();
  const fn = (r?.borrower?.full_name ?? "").trim();
  return dn || fn || "Borrower";
}

export default function OwnerRequestDetailPage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();
  const requestId = params?.requestId;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [req, setReq] = useState<RequestDetail | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!requestId) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: qErr } = await supabase
          .from("borrow_requests")
          .select(
            `
            id,status,start_date,end_date,message,horse_id,borrower_id,
            horse:horses(id,name,owner_id),
            borrower:profiles(id,display_name,full_name)
          `
          )
          .eq("id", requestId)
          .single();

        if (qErr) throw qErr;
        if (!cancelled) setReq((data ?? null) as RequestDetail | null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load request.");
        if (!cancelled) setReq(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const status = useMemo(() => String(req?.status ?? "pending"), [req?.status]);
  const canAct = status === "pending";

  const approve = async () => {
    if (!requestId || !canAct) return;
    setBusy(true);
    setError(null);

    try {
      const { error: uErr } = await supabase.from("borrow_requests").update({ status: "approved" }).eq("id", requestId);
      if (uErr) throw uErr;

      // refresh view
      setReq((prev) => (prev ? { ...prev, status: "approved" } : prev));
    } catch (e: any) {
      setError(e?.message ?? "Failed to approve request.");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!requestId || !canAct) return;
    setBusy(true);
    setError(null);

    try {
      const { error: uErr } = await supabase.from("borrow_requests").update({ status: "rejected" }).eq("id", requestId);
      if (uErr) throw uErr;

      setReq((prev) => (prev ? { ...prev, status: "rejected" } : prev));
    } catch (e: any) {
      setError(e?.message ?? "Failed to reject request.");
    } finally {
      setBusy(false);
    }
  };

  const horseName = req?.horse?.name ?? "Horse";
  const borrowerName = pickBorrowerName(req);

  return (
    <div style={pageWrap()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950 }}>Request Details</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
            Review the request, then approve or reject.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/dashboard/owner/requests" style={btn("secondary")}>
            ← Back to requests
          </Link>
          <Link href="/dashboard/owner" style={btn("secondary")}>
            Overview
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 14, fontSize: 13, color: "rgba(0,0,0,0.6)" }}>Loading…</div>
      ) : null}

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

      {!loading && !error && !req ? (
        <div style={{ marginTop: 14, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>Request not found.</div>
      ) : null}

      {!loading && req ? (
        <>
          <div style={{ marginTop: 14, ...card() }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, fontSize: 16 }}>{horseName}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.70)" }}>
                  Borrower: <span style={{ fontWeight: 900 }}>{borrowerName}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.70)" }}>
                  Dates: <span style={{ fontWeight: 900 }}>{fmt(req.start_date)} → {fmt(req.end_date)}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span style={pill(status)}>{status.toUpperCase()}</span>

                {req.horse_id ? (
                  <Link href={`/dashboard/owner/horses/${req.horse_id}/availability`} style={btn("secondary")}>
                    Availability
                  </Link>
                ) : null}

                {/* Messages thread (you already use /messages/[requestId]) */}
                <button onClick={() => router.push(`/messages/${req.id}`)} style={btn("secondary")}>
                  Messages
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 13, color: "rgba(0,0,0,0.75)" }}>Message</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "rgba(0,0,0,0.78)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {req.message?.trim() ? req.message : "No message provided."}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, ...card() }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 950 }}>Actions</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
                  Only pending requests can be approved/rejected.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={approve} disabled={!canAct || busy} style={btn("primary")}>
                  {busy ? "Working…" : "Approve"}
                </button>
                <button onClick={reject} disabled={!canAct || busy} style={btn("danger")}>
                  Reject
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div style={{ height: 18 }} />
    </div>
  );
}