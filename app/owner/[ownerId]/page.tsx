"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { VerificationBadge } from "@/components/VerificationBadge";

type ProfileRow = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  created_at: string | null;
  role: "owner" | "borrower" | null;

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

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

function pageWrap(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: "calc(100vh - 64px)",
    background: `linear-gradient(180deg, ${palette.cream} 0%, rgba(250,250,250,1) 70%)`,
    padding: "18px 0 28px",
  };
}

const container: React.CSSProperties = {
  padding: 16,
  maxWidth: 1000,
  margin: "0 auto",
};

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(31,42,68,0.12)",
    borderRadius: 18,
    padding: 16,
    background: "rgba(255,255,255,0.82)",
    boxShadow: "0 16px 44px rgba(31,42,68,0.08)",
    backdropFilter: "blur(6px)",
  };
}

function btn(kind: "primary" | "secondary"): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 14,
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
    border: "1px solid rgba(0,0,0,0.10)",
  };

  if (kind === "primary") {
    return {
      ...base,
      background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
      color: "white",
      boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
    };
  }

  return {
    ...base,
    background: "rgba(255,255,255,0.78)",
    color: palette.navy,
    border: "1px solid rgba(31,42,68,0.18)",
    boxShadow: "0 12px 30px rgba(31,42,68,0.06)",
  };
}

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

/** Always-yellow read-only stars */
function StarsReadOnly({ value, size = 18 }: { value: number; size?: number }) {
  const clamped = Math.max(0, Math.min(5, value));
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;

  const starStyle: React.CSSProperties = {
    fontSize: size,
    lineHeight: 1,
    letterSpacing: 2,
    userSelect: "none",
  };

  const filledColor = "#f59e0b";
  const emptyColor = "rgba(31,42,68,0.22)";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      <span style={{ ...starStyle, color: filledColor }}>
        {"★".repeat(full)}
        {half ? "★" : ""}
      </span>
      <span style={{ ...starStyle, color: emptyColor }}>{"☆".repeat(empty)}</span>
    </div>
  );
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
        const [profRes, horsesRes, reviewsRes] = await Promise.all([
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

        if (!reviewsRes.error) {
          const list = (reviewsRes.data ?? []) as ReviewRow[];
          setReviews(list);

          const count = list.length;
          const sum = list.reduce((acc, r) => acc + Number(r.rating ?? 0), 0);
          const avg = count > 0 ? sum / count : 0;

          setRatingCount(count);
          setRatingAvg(avg);

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
            } else if (!cancelled) {
              setReviewersById({});
            }
          } else {
            setReviewersById({});
          }
        } else {
          setReviews([]);
          setReviewersById({});
          setRatingAvg(0);
          setRatingCount(0);
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
    <div style={pageWrap()}>
      <div style={container}>
        {/* Top Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => router.push("/browse")} style={btn("secondary")}>
            ← Browse
          </button>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link href="/messages" style={btn("secondary")}>
              Messages
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 14, ...card(), fontSize: 13, color: "rgba(31,42,68,0.70)" }}>Loading…</div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 14,
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

        {!loading && !error && !profile ? (
          <div style={{ marginTop: 14, fontSize: 13, color: "rgba(31,42,68,0.70)" }}>Owner not found.</div>
        ) : null}

        {!loading && profile ? (
          <>
            {/* Profile Card */}
            <div style={{ marginTop: 14, ...card() }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "rgba(31,42,68,0.06)",
                    border: "1px solid rgba(31,42,68,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 950,
                    flexShrink: 0,
                  }}
                >
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 16, color: "rgba(31,42,68,0.75)" }}>{initials(displayName)}</span>
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <h1 style={{ margin: 0, fontSize: 22, color: palette.navy }}>{displayName}</h1>
                  <div style={{ marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.70)" }}>{subtitle}</div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <VerificationBadge
                      status={profile.verification_status ?? "unverified"}
                      verifiedAt={profile.verified_at ?? null}
                      provider={profile.verification_provider ?? null}
                      compact
                    />
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <StarsReadOnly value={ratingCount > 0 ? Number(ratingAvg.toFixed(1)) : 0} size={18} />
                    <div style={{ fontSize: 13, color: "rgba(31,42,68,0.72)", fontWeight: 900 }}>
                      {ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount})` : "No reviews yet"}
                    </div>
                  </div>

                  {!isOwner ? (
                    <div style={{ marginTop: 10, fontSize: 13, color: "rgba(180,0,0,0.9)", fontWeight: 850 }}>
                      This user is not listed as an owner.
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      border: "1px solid rgba(31,42,68,0.12)",
                      background: "rgba(31,42,68,0.04)",
                      padding: "8px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 950,
                      color: palette.navy,
                    }}
                  >
                    {horses.length} active horse{horses.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </div>

            {/* Listings */}
            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>Available horses</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.70)" }}>
                Click request to choose dates (availability enforced).
              </div>

              {horses.length === 0 ? (
                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(31,42,68,0.70)" }}>
                  No active horses listed right now.
                </div>
              ) : null}

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {horses.map((h) => (
                  <div key={h.id} style={card()}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950, fontSize: 15, color: palette.navy }}>{h.name ?? "Horse"}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.70)" }}>Status: Active</div>
                      </div>

                      <Link href={`/request?horseId=${h.id}`} style={btn("primary")}>
                        Request →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>Reviews</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.70)" }}>
                Latest feedback from borrowers.
              </div>

              {reviews.length === 0 ? (
                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(31,42,68,0.70)" }}>No reviews yet.</div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  {reviews.map((r) => (
                    <div key={r.id} style={card()}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "rgba(31,42,68,0.72)", fontWeight: 900 }}>
                            {reviewerLabel(r.borrower_id)} · {fmtDate(r.created_at)}
                          </div>

                          {r.comment?.trim() ? (
                            <div style={{ marginTop: 8, fontSize: 13, color: "rgba(31,42,68,0.88)", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                              {r.comment}
                            </div>
                          ) : (
                            <div style={{ marginTop: 8, fontSize: 13, color: "rgba(31,42,68,0.55)" }}>No comment.</div>
                          )}
                        </div>

                        <div style={{ flexShrink: 0 }}>
                          <StarsReadOnly value={Number(r.rating ?? 0)} size={18} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reviews.length >= 50 ? (
                <div style={{ marginTop: 10, fontSize: 12, color: "rgba(31,42,68,0.55)" }}>Showing latest 50 reviews.</div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}