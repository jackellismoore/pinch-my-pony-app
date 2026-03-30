"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

type ReviewRow = {
  id: string;
  request_id: string;
  borrower_id: string | null;
  owner_id: string | null;
  horse_id: string | null;
  rating: number | null;
  comment: string | null;
  created_at?: string | null;
};

type BorrowRequestMini = {
  id: string;
  start_date: string | null;
  end_date: string | null;
};

type HorseMini = {
  id: string;
  name: string | null;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function personName(profile: ProfileMini | null | undefined) {
  const dn = profile?.display_name?.trim();
  if (dn) return dn;
  const fn = profile?.full_name?.trim();
  if (fn) return fn;
  return "Borrower";
}

function renderStars(rating: number | null | undefined) {
  const value = Math.max(0, Math.min(5, Number(rating ?? 0)));
  return "★".repeat(value) + "☆".repeat(5 - value);
}

const btn = (kind: "primary" | "secondary") =>
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
    background: kind === "primary" ? `linear-gradient(180deg, ${palette.forest}, #173223)` : "rgba(255,255,255,0.72)",
    color: kind === "primary" ? "white" : palette.navy,
    boxShadow: kind === "primary" ? "0 14px 34px rgba(31,61,43,0.18)" : "0 14px 34px rgba(31,42,68,0.08)",
    minHeight: 44,
  }) as React.CSSProperties;

export default function OwnerReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [horsesById, setHorsesById] = useState<Record<string, HorseMini>>({});
  const [borrowersById, setBorrowersById] = useState<Record<string, ProfileMini>>({});
  const [requestsById, setRequestsById] = useState<Record<string, BorrowRequestMini>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw userErr;
        if (!user) throw new Error("Not authenticated");

        const { data: reviewsData, error: reviewsErr } = await supabase
          .from("reviews")
          .select("id,request_id,borrower_id,owner_id,horse_id,rating,comment,created_at")
          .eq("owner_id", user.id)
          .order("id", { ascending: false });

        if (reviewsErr) throw reviewsErr;

        const reviewRows = (reviewsData ?? []) as ReviewRow[];

        if (cancelled) return;
        setReviews(reviewRows);

        const horseIds = Array.from(
          new Set(reviewRows.map((r) => r.horse_id).filter(Boolean) as string[])
        );
        const borrowerIds = Array.from(
          new Set(reviewRows.map((r) => r.borrower_id).filter(Boolean) as string[])
        );
        const requestIds = Array.from(
          new Set(reviewRows.map((r) => r.request_id).filter(Boolean))
        );

        const [horsesRes, borrowersRes, requestsRes] = await Promise.all([
          horseIds.length
            ? supabase.from("horses").select("id,name").in("id", horseIds)
            : Promise.resolve({ data: [], error: null } as any),
          borrowerIds.length
            ? supabase.from("profiles").select("id,display_name,full_name").in("id", borrowerIds)
            : Promise.resolve({ data: [], error: null } as any),
          requestIds.length
            ? supabase.from("borrow_requests").select("id,start_date,end_date").in("id", requestIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        if (horsesRes.error) throw horsesRes.error;
        if (borrowersRes.error) throw borrowersRes.error;
        if (requestsRes.error) throw requestsRes.error;

        if (cancelled) return;

        const horseMap: Record<string, HorseMini> = {};
        for (const h of ((horsesRes.data ?? []) as HorseMini[])) {
          horseMap[h.id] = h;
        }

        const borrowerMap: Record<string, ProfileMini> = {};
        for (const b of ((borrowersRes.data ?? []) as ProfileMini[])) {
          borrowerMap[b.id] = b;
        }

        const requestMap: Record<string, BorrowRequestMini> = {};
        for (const r of ((requestsRes.data ?? []) as BorrowRequestMini[])) {
          requestMap[r.id] = r;
        }

        setHorsesById(horseMap);
        setBorrowersById(borrowerMap);
        setRequestsById(requestMap);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load reviews.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const reviewCount = reviews.length;

  const averageRating = useMemo(() => {
    const valid = reviews
      .map((r) => Number(r.rating))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (valid.length === 0) return null;
    const avg = valid.reduce((sum, n) => sum + n, 0) / valid.length;
    return avg.toFixed(1);
  }, [reviews]);

  const fiveStarCount = useMemo(
    () => reviews.filter((r) => Number(r.rating) === 5).length,
    [reviews]
  );

  const withCommentCount = useMemo(
    () => reviews.filter((r) => Boolean(r.comment?.trim())).length,
    [reviews]
  );

  return (
    <div className="pmp-pageShell">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div className="pmp-kicker">Owner dashboard</div>
          <h1 className="pmp-pageTitle">Reviews</h1>
          <div className="pmp-mutedText" style={{ marginTop: 6 }}>
            Feedback left by borrowers after approved bookings.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/dashboard/owner" style={btn("secondary")}>
            Overview
          </Link>
          <Link href="/dashboard/owner/requests" style={btn("secondary")}>
            Requests
          </Link>
        </div>
      </div>

      <section className="pmp-statGrid" style={{ marginTop: 16 }}>
        <article className="pmp-statCard">
          <div className="pmp-statLabel">Total reviews</div>
          <div className="pmp-statValue">{reviewCount}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">Average rating</div>
          <div className="pmp-statValue">{averageRating ?? "—"}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">5 star reviews</div>
          <div className="pmp-statValue">{fiveStarCount}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">With comments</div>
          <div className="pmp-statValue">{withCommentCount}</div>
        </article>
      </section>

      {loading ? <div style={{ marginTop: 16 }} className="pmp-mutedText">Loading…</div> : null}
      {error ? <div className="pmp-errorBanner" style={{ marginTop: 16 }}>{error}</div> : null}

      <section className="pmp-sectionCard" style={{ marginTop: 16 }}>
        <div className="pmp-sectionHeader">
          <div>
            <div className="pmp-kicker">Borrower feedback</div>
            <h3 className="pmp-sectionTitle">Recent reviews</h3>
          </div>
          <div className="pmp-mutedText">
            {reviewCount} review{reviewCount === 1 ? "" : "s"}
          </div>
        </div>

        {!loading && !error && reviews.length === 0 ? (
          <div className="pmp-emptyState">
            <div className="pmp-emptyIcon">⭐</div>
            <div className="pmp-emptyTitle">No reviews yet</div>
            <div className="pmp-emptyText">
              Reviews will appear here once borrowers leave feedback after their booking.
            </div>
            <Link href="/dashboard/owner/requests" className="pmp-ctaPrimary">
              View requests
            </Link>
          </div>
        ) : (
          <div className="pmp-listStack">
            {reviews.map((review) => {
              const horse = review.horse_id ? horsesById[review.horse_id] : null;
              const borrower = review.borrower_id ? borrowersById[review.borrower_id] : null;
              const request = requestsById[review.request_id] ?? null;

              return (
                <div key={review.id} className="pmp-horseRowCard">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div
                          style={{
                            fontSize: 18,
                            lineHeight: 1,
                            letterSpacing: 1,
                            color: palette.gold,
                            fontWeight: 900,
                          }}
                        >
                          {renderStars(review.rating)}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 900,
                            color: palette.navy,
                          }}
                        >
                          {Number(review.rating ?? 0)}/5
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 15, fontWeight: 950, color: palette.navy }}>
                        {horse?.name ?? "Horse"}
                      </div>

                      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.70)", lineHeight: 1.6 }}>
                        Borrower: <span style={{ fontWeight: 950 }}>{personName(borrower)}</span>
                      </div>

                      <div style={{ marginTop: 4, fontSize: 13, color: "rgba(0,0,0,0.70)", lineHeight: 1.6 }}>
                        Booking:{" "}
                        <span style={{ fontWeight: 950 }}>
                          {fmtDate(request?.start_date)} → {fmtDate(request?.end_date)}
                        </span>
                      </div>

                      {review.comment?.trim() ? (
                        <div
                          style={{
                            marginTop: 12,
                            fontSize: 13,
                            color: "rgba(0,0,0,0.78)",
                            lineHeight: 1.7,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {review.comment.trim()}
                        </div>
                      ) : (
                        <div
                          style={{
                            marginTop: 12,
                            fontSize: 13,
                            color: "rgba(0,0,0,0.52)",
                            lineHeight: 1.6,
                          }}
                        >
                          No written comment provided.
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Link href={`/messages/${review.request_id}`} className="pmp-ctaSecondary">
                        View thread
                      </Link>

                      {review.horse_id ? (
                        <Link
                          href={`/dashboard/owner/horses/${review.horse_id}/availability`}
                          className="pmp-ctaSecondary"
                        >
                          Availability
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
