"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import StarRating from "@/components/StarRating";

type BorrowRequestRow = {
  id: string;
  horse_id: string;
  borrower_id: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

type HorseRow = {
  id: string;
  name: string | null;
  owner_id: string;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

export default function ReviewPage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();
  const requestId = params?.requestId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [req, setReq] = useState<BorrowRequestRow | null>(null);
  const [horse, setHorse] = useState<HorseRow | null>(null);
  const [owner, setOwner] = useState<ProfileMini | null>(null);

  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const ownerLabel = useMemo(() => {
    const dn = owner?.display_name?.trim();
    const fn = owner?.full_name?.trim();
    return dn || fn || "Owner";
  }, [owner]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const uid = auth?.user?.id ?? null;
        if (!uid) {
          setMyUserId(null);
          throw new Error("You must be logged in to leave a review.");
        }
        if (!cancelled) setMyUserId(uid);

        if (!requestId) throw new Error("Missing requestId in URL.");

        const { data: reqData, error: reqErr } = await supabase
          .from("borrow_requests")
          .select("id,horse_id,borrower_id,status,start_date,end_date")
          .eq("id", requestId)
          .single();

        if (reqErr) throw reqErr;

        const r = (reqData ?? null) as BorrowRequestRow | null;
        if (!r) throw new Error("Request not found.");
        if (r.borrower_id !== uid) throw new Error("You can only review requests you borrowed.");

        // Must be accepted/approved to review (UI check; RLS should also enforce)
        const s = String(r.status ?? "");
        if (s !== "accepted" && s !== "approved") {
          throw new Error("You can only review accepted/approved requests.");
        }

        // If already reviewed, detect and short-circuit
        const { data: existing, error: exErr } = await supabase
          .from("reviews")
          .select("id")
          .eq("request_id", requestId)
          .eq("borrower_id", uid)
          .maybeSingle();

        if (exErr) {
          // Don’t block the UI; let insert/RLS/unique constraint handle duplicates
          console.warn("existing review check error:", exErr);
          if (!cancelled) setExistingReviewId(null);
        } else {
          if (!cancelled) setExistingReviewId(existing?.id ?? null);
        }

        const { data: horseData, error: horseErr } = await supabase
          .from("horses")
          .select("id,name,owner_id")
          .eq("id", r.horse_id)
          .single();

        if (horseErr) throw horseErr;

        const h = (horseData ?? null) as HorseRow | null;
        if (!h) throw new Error("Horse not found for this request.");

        const { data: ownerData, error: ownerErr } = await supabase
          .from("profiles")
          .select("id,display_name,full_name")
          .eq("id", h.owner_id)
          .maybeSingle();

        if (ownerErr) {
          // non-fatal
          console.warn("owner profile load error:", ownerErr);
        }

        if (!cancelled) {
          setReq(r);
          setHorse(h);
          setOwner((ownerData ?? null) as ProfileMini | null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load review page.");
        if (!cancelled) {
          setReq(null);
          setHorse(null);
          setOwner(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const submit = async () => {
    if (!myUserId || !req || !horse) return;

    const s = String(req.status ?? "");
    if (s !== "accepted" && s !== "approved") {
      setError("You can only review accepted/approved requests.");
      return;
    }

    // basic validation
    const cleanComment = comment.trim();
    if (cleanComment.length > 1200) {
      setError("Comment is too long (max 1200 characters).");
      return;
    }
    if (rating < 1 || rating > 5) {
      setError("Rating must be between 1 and 5.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        request_id: req.id,
        borrower_id: myUserId,
        owner_id: horse.owner_id, // ✅ needed for owner profile aggregates
        horse_id: horse.id, // ✅ useful for horse/browse linkage
        rating,
        comment: cleanComment ? cleanComment : null,
      };

      const { error: insertErr } = await supabase.from("reviews").insert(payload);
      if (insertErr) throw insertErr;

      // After success, go back to messages thread
      router.push(`/messages/${req.id}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit review.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontSize: 18, fontWeight: 950 }}>Leave a review</div>
        <div style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  if (existingReviewId) {
    return (
      <div style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 950 }}>Review already submitted</div>
          <Link href="/messages" style={{ textDecoration: "none", color: "#2563eb", fontWeight: 900, fontSize: 13 }}>
            Back to messages
          </Link>
        </div>

        <div
          style={{
            marginTop: 14,
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 14,
            padding: 14,
            background: "white",
            fontSize: 13,
            color: "rgba(0,0,0,0.70)",
          }}
        >
          You’ve already left a review for this request.
        </div>

        {req?.id ? (
          <div style={{ marginTop: 12 }}>
            <Link
              href={`/messages/${req.id}`}
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                background: "black",
                color: "white",
                padding: "10px 12px",
                borderRadius: 12,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 950,
                display: "inline-block",
              }}
            >
              Go to thread →
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 950 }}>Leave a review</div>
        <Link href="/messages" style={{ textDecoration: "none", color: "#2563eb", fontWeight: 900, fontSize: 13 }}>
          Back
        </Link>
      </div>

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
          borderRadius: 14,
          padding: 14,
          background: "white",
          boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 15 }}>{horse?.name ?? "Horse"}</div>
        <div style={{ marginTop: 6, fontSize: 13, color: "rgba(15,23,42,0.70)" }}>
          Owner: <span style={{ fontWeight: 950 }}>{ownerLabel}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: "rgba(15,23,42,0.70)" }}>
          Dates:{" "}
          <span style={{ fontWeight: 950 }}>
            {fmtDate(req?.start_date ?? null)} → {fmtDate(req?.end_date ?? null)}
          </span>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: "rgba(15,23,42,0.70)" }}>
          Status: <span style={{ fontWeight: 950 }}>{req?.status ?? "—"}</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid rgba(15,23,42,0.10)",
          borderRadius: 14,
          padding: 14,
          background: "white",
          boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 13, color: "rgba(15,23,42,0.85)" }}>Rating</div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <StarRating value={rating} onChange={setRating} size={22} />
          <div style={{ fontSize: 13, color: "rgba(15,23,42,0.70)", fontWeight: 900 }}>{rating}/5</div>
        </div>

        <div style={{ marginTop: 14, fontWeight: 950, fontSize: 13, color: "rgba(15,23,42,0.85)" }}>
          Comment (optional)
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How was the experience?"
          rows={5}
          style={{
            width: "100%",
            marginTop: 8,
            border: "1px solid rgba(15,23,42,0.12)",
            borderRadius: 12,
            padding: 12,
            fontSize: 13,
            outline: "none",
            background: "rgba(15,23,42,0.02)",
            resize: "vertical",
          }}
        />

        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
          {comment.trim().length}/1200
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              border: "1px solid rgba(0,0,0,0.14)",
              background: saving ? "rgba(0,0,0,0.35)" : "black",
              color: "white",
              padding: "10px 12px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 950,
              cursor: saving ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {saving ? "Submitting…" : "Submit review →"}
          </button>

          {horse?.owner_id ? (
            <Link
              href={`/owner/${horse.owner_id}`}
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                background: "white",
                color: "black",
                padding: "10px 12px",
                borderRadius: 12,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 950,
                whiteSpace: "nowrap",
              }}
            >
              View owner
            </Link>
          ) : null}

          {req?.id ? (
            <Link
              href={`/messages/${req.id}`}
              style={{
                border: "1px solid rgba(15,23,42,0.14)",
                background: "rgba(15,23,42,0.03)",
                color: "black",
                padding: "10px 12px",
                borderRadius: 12,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 950,
                whiteSpace: "nowrap",
              }}
            >
              View thread
            </Link>
          ) : null}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
          Reviews can only be submitted for <span style={{ fontWeight: 950 }}>accepted/approved</span> requests.
        </div>
      </div>
    </div>
  );
}