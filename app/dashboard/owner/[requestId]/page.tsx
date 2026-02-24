"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

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

const card: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
};

const btn = (kind: "primary" | "secondary" | "danger") =>
  ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 950,
    whiteSpace: "nowrap",
    border: "1px solid rgba(31,42,68,0.16)",
    background:
      kind === "primary"
        ? `linear-gradient(180deg, ${palette.forest}, #173223)`
        : kind === "danger"
        ? "rgba(255,255,255,0.72)"
        : "rgba(255,255,255,0.72)",
    color: kind === "primary" ? "white" : kind === "danger" ? "rgba(160,0,0,0.95)" : palette.navy,
    boxShadow: kind === "primary" ? "0 14px 34px rgba(31,61,43,0.18)" : "0 14px 34px rgba(31,42,68,0.08)",
    cursor: "pointer",
  }) as React.CSSProperties;

function fmt(d: string | null) {
  if (!d) return "—";
  return String(d).slice(0, 10);
}

function pill(kind: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
    letterSpacing: 0.2,
  };

  if (kind === "approved" || kind === "accepted")
    return { ...base, background: "rgba(31,61,43,0.10)", color: palette.forest, border: "1px solid rgba(31,61,43,0.18)" };

  if (kind === "rejected")
    return { ...base, background: "rgba(220,0,0,0.08)", color: "rgba(160,0,0,0.95)", border: "1px solid rgba(220,0,0,0.18)" };

  if (kind === "pending")
    return { ...base, background: "rgba(200,162,77,0.16)", color: "rgba(110,75,0,0.95)", border: "1px solid rgba(200,162,77,0.28)" };

  return { ...base, background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.70)", border: "1px solid rgba(31,42,68,0.12)" };
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
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.3, color: palette.navy, fontWeight: 950 }}>Request Details</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.62)", lineHeight: 1.6 }}>
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

      {loading ? <div style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>Loading…</div> : null}

      {error ? (
        <div
          style={{
            marginTop: 16,
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.06)",
            padding: 12,
            borderRadius: 14,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && !req ? (
        <div style={{ marginTop: 16, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>Request not found.</div>
      ) : null}

      {!loading && req ? (
        <>
          <div
            style={{
              marginTop: 16,
              ...card,
              padding: 16,
              background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,241,232,0.55) 140%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>{horseName}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: "rgba(0,0,0,0.70)" }}>
                  Borrower: <span style={{ fontWeight: 950, color: "rgba(0,0,0,0.85)" }}>{borrowerName}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.70)" }}>
                  Dates:{" "}
                  <span style={{ fontWeight: 950, color: "rgba(0,0,0,0.85)" }}>
                    {fmt(req.start_date)} → {fmt(req.end_date)}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span style={pill(status)}>{status.toUpperCase()}</span>

                {req.horse_id ? (
                  <Link href={`/dashboard/owner/horses/${req.horse_id}/availability`} style={btn("secondary")}>
                    Availability
                  </Link>
                ) : null}

                <button onClick={() => router.push(`/messages/${req.id}`)} style={btn("secondary")}>
                  Messages
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, borderTop: "1px solid rgba(31,42,68,0.10)", paddingTop: 14 }}>
              <div style={{ fontWeight: 950, fontSize: 13, color: palette.navy }}>Message</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "rgba(0,0,0,0.78)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {req.message?.trim() ? req.message : "No message provided."}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, ...card, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 950, color: palette.navy }}>Actions</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.62)", lineHeight: 1.6 }}>
                  Only pending requests can be approved/rejected.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={approve} disabled={!canAct || busy} style={{ ...btn("primary"), opacity: !canAct || busy ? 0.6 : 1 }}>
                  {busy ? "Working…" : "Approve"}
                </button>
                <button onClick={reject} disabled={!canAct || busy} style={{ ...btn("danger"), opacity: !canAct || busy ? 0.6 : 1 }}>
                  Reject
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div style={{ height: 24 }} />
    </div>
  );
}