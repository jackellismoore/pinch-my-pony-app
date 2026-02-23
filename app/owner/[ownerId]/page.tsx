"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import StarRating from "@/components/StarRating";
import { VerificationBadge } from "@/components/VerificationBadge";

type ProfileRow = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  created_at: string | null;
  role: "owner" | "borrower" | null;

  // ✅ verification fields
  verification_status: string | null;
  verified_at: string | null;
  verification_provider: string | null;
};

type HorseRow = {
  id: string;
  owner_id: string;
  name: string | null;
  is_active: boolean | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  borrower_id: string;
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

function initials(name: string) {
  const parts = name
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase() || "U";
}

export default function OwnerPublicProfilePage() {
  const params = useParams<{ ownerId: string }>();
  const router = useRouter();
  const ownerId = params?.ownerId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [horses, setHorses] = useState<HorseRow[]>([]);

  const [ratingAvg, setRatingAvg] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewersById, setReviewersById] = useState<Record<string, ProfileMini>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!ownerId) return;

      setLoading(true);
      setError(null);

      try {
        const [profRes, horsesRes, aggRes, reviewsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id,display_name,full_name,avatar_url,last_seen_at,created_at,role,verification_status,verified_at,verification_provider"
            )
            .eq("id", ownerId)
            .single(),

          supabase
            .from("horses")
            .select("id,owner_id,name,is_active")
            .eq("owner_id", ownerId)
            .eq("is_active", true)
            .order("created_at", { ascending: false }),

          supabase
            .from("reviews")
            .select("avg:rating.avg(), count:rating.count()")
            .eq("owner_id", ownerId)
            .maybeSingle(),

          supabase
            .from("reviews")
            .select("id,rating,comment,created_at,borrower_id")
            .eq("owner_id", ownerId)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        if (cancelled) return;

        if (profRes.error) throw profRes.error;
        if (horsesRes.error) throw horsesRes.error;

        setProfile((profRes.data ?? null) as ProfileRow | null);
        setHorses((horsesRes.data ?? []) as HorseRow[]);

        if (!aggRes.error) {
          const avg = Number((aggRes.data as any)?.avg ?? 0);
          const count = Number((aggRes.data as any)?.count ?? 0);
          setRatingAvg(avg);
          setRatingCount(count);
        } else {
          setRatingAvg(0);
          setRatingCount(0);
        }

        if (!reviewsRes.error) {
          const list = (reviewsRes.data ?? []) as ReviewRow[];
          setReviews(list);

          const borrowerIds = Array.from(new Set(list.map((r) => r.borrower_id).filter(Boolean)));
          if (borrowerIds.length > 0) {
            const { data: reviewerData, error: reviewerErr } = await supabase
              .from("profiles")
              .select("id,display_name,full_name")
              .in("id", borrowerIds);

            if (!cancelled && !reviewerErr) {
              const map: Record<string, ProfileMini> = {};
              for (const p of (reviewerData ?? []) as ProfileMini[]) map[p.id] = p;
              setReviewersById(map);
            }
          } else {
            setReviewersById({});
          }
        } else {
          setReviews([]);
          setReviewersById({});
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load owner profile.");
        setProfile(null);
        setHorses([]);
        setRatingAvg(0);
        setRatingCount(0);
        setReviews([]);
        setReviewersById({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const displayName = useMemo(() => {
    const dn = profile?.display_name?.trim();
    const fn = profile?.full_name?.trim();
    return dn || fn || "Owner";
  }, [profile]);

  const subtitle = useMemo(() => {
    const created = fmtDate(profile?.created_at ?? null);
    const lastSeen = profile?.last_seen_at ? fmtDate(profile.last_seen_at) : null;
    return lastSeen ? `Member since ${created} · Last seen ${lastSeen}` : `Member since ${created}`;
  }, [profile]);

  const isOwner = profile?.role === "owner";

  function reviewerLabel(id: string) {
    const p = reviewersById[id];
    const dn = p?.display_name?.trim();
    const fn = p?.full_name?.trim();
    return dn || fn || "Borrower";
  }

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => router.push("/browse")}
          style={{
            border: "1px solid rgba(0,0,0,0.14)",
            background: "white",
            padding: "9px 10px",
            borderRadius: 12,
            fontWeight: 900,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ← Browse
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link
            href="/messages"
            style={{
              border: "1px solid rgba(0,0,0,0.14)",
              background: "white",
              padding: "9px 10px",
              borderRadius: 12,
              fontWeight: 900,
              fontSize: 13,
              textDecoration: "none",
              color: "black",
            }}
          >
            Messages
          </Link>
        </div>
      </div>

      {/* Loading / Error */}
      {loading ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 14,
            padding: 14,
            background: "white",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: "rgba(0,0,0,0.06)",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, width: 220, background: "rgba(0,0,0,0.06)", borderRadius: 8 }} />
              <div
                style={{
                  marginTop: 10,
                  height: 12,
                  width: 320,
                  background: "rgba(0,0,0,0.05)",
                  borderRadius: 8,
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 18, height: 12, width: 260, background: "rgba(0,0,0,0.04)", borderRadius: 8 }} />
          <div style={{ marginTop: 10, height: 80, background: "rgba(0,0,0,0.03)", borderRadius: 12 }} />
        </div>
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

      {!loading && !error && !profile ? (
        <div style={{ marginTop: 14, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>Owner not found.</div>
      ) : null}

      {/* Profile Card */}
      {!loading && profile ? (
        <>
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(0,0,0,0.10)",
              borderRadius: 14,
              padding: 14,
              background: "white",
              display: "flex",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                overflow: "hidden",
                background: "rgba(0,0,0,0.06)",
                border: "1px solid rgba(0,0,0,0.10)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 950,
              }}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 16, color: "rgba(0,0,0,0.75)" }}>{initials(displayName)}</span>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 22 }}>{displayName}</h1>
              <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>{subtitle}</div>

              {/* ✅ Verification badge */}
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <VerificationBadge
                  status={profile.verification_status ?? "unverified"}
                  verifiedAt={profile.verified_at ?? null}
                  provider={profile.verification_provider ?? null}
                  compact
                />
              </div>

              {/* Rating summary */}
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <StarRating value={ratingCount > 0 ? Number(ratingAvg.toFixed(1)) : 0} readOnly size={18} />
                <div style={{ fontSize: 13, color: "rgba(0,0,0,0.70)", fontWeight: 800 }}>
                  {ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount})` : "No reviews yet"}
                </div>
              </div>

              {!isOwner ? (
                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(180,0,0,0.9)", fontWeight: 800 }}>
                  This user is not listed as an owner.
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: "rgba(0,0,0,0.03)",
                  padding: "8px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {horses.length} active horse{horses.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          {/* Listings */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Available horses</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
              Click request to choose dates (availability enforced).
            </div>

            {horses.length === 0 ? (
              <div style={{ marginTop: 10, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
                No active horses listed right now.
              </div>
            ) : null}

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              {horses.map((h) => (
                <div
                  key={h.id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.10)",
                    borderRadius: 14,
                    padding: 14,
                    background: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{h.name ?? "Horse"}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>Status: Active</div>
                  </div>

                  <Link
                    href={`/request?horseId=${h.id}`}
                    style={{
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "black",
                      color: "white",
                      padding: "10px 12px",
                      borderRadius: 12,
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Request →
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Reviews</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
              Latest feedback from borrowers.
            </div>

            {reviews.length === 0 ? (
              <div style={{ marginTop: 10, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>No reviews yet.</div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid rgba(0,0,0,0.10)",
                      borderRadius: 14,
                      padding: 14,
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "rgba(0,0,0,0.70)", fontWeight: 850 }}>
                          {reviewerLabel(r.borrower_id)} · {fmtDate(r.created_at)}
                        </div>

                        {r.comment?.trim() ? (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 13,
                              color: "rgba(0,0,0,0.85)",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {r.comment}
                          </div>
                        ) : (
                          <div style={{ marginTop: 8, fontSize: 13, color: "rgba(0,0,0,0.55)" }}>No comment.</div>
                        )}
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <StarRating value={r.rating} readOnly size={18} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reviews.length >= 50 ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>Showing latest 50 reviews.</div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}