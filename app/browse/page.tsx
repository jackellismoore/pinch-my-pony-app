"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HorseMap from "@/components/HorseMap";
import { supabase } from "@/lib/supabaseClient";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import StarRating from "@/components/StarRating";

type HorseRow = {
  id: string;
  owner_id: string;
  name: string | null;
  location: string | null;
  image_url: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
  lat: number | null;
  lng: number | null;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
};

type BlockRow = {
  id: string;
  horse_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
};

type BookingRow = {
  id: string;
  horse_id: string;
  start_date: string;
  end_date: string;
};

type NextRange = {
  kind: "blocked" | "booking";
  startDate: string;
  endDate: string;
  label: string;
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function isHorseActive(h: HorseRow) {
  if (typeof h.active === "boolean") return h.active;
  if (typeof h.is_active === "boolean") return h.is_active;
  return true;
}

export default function BrowsePage() {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileMini>>({});
  const [nextByHorseId, setNextByHorseId] = useState<Record<string, NextRange | null>>({});
  const [ratingByOwnerId, setRatingByOwnerId] = useState<
    Record<string, { avg: number; count: number }>
  >({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: sessData } = await supabase.auth.getSession();
        const viewer = sessData.session?.user ?? null;
        if (!cancelled) setViewerId(viewer?.id ?? null);

        const { data: horsesData, error: horsesErr } = await supabase
          .from("horses")
          .select("id,owner_id,name,location,image_url,active,is_active,lat,lng")
          .or("active.eq.true,is_active.eq.true")
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (horsesErr) throw horsesErr;

        const horseRows = ((horsesData ?? []) as HorseRow[]).filter(isHorseActive);
        setHorses(horseRows);

        const ownerIds = Array.from(new Set(horseRows.map((h) => h.owner_id).filter(Boolean)));
        const horseIds = horseRows.map((h) => h.id);

        if (ownerIds.length > 0) {
          const { data: profData, error: profErr } = await supabase
            .from("profiles")
            .select("id,display_name,full_name")
            .in("id", ownerIds);

          if (!cancelled && !profErr) {
            const map: Record<string, ProfileMini> = {};
            for (const p of (profData ?? []) as ProfileMini[]) map[p.id] = p;
            setProfilesById(map);
          }
        }

        if (ownerIds.length > 0) {
          const { data: reviewRows, error: reviewErr } = await supabase
            .from("reviews")
            .select("owner_id,rating")
            .in("owner_id", ownerIds);

          if (!cancelled && !reviewErr) {
            const map: Record<string, { avg: number; count: number }> = {};

            for (const row of (reviewRows ?? []) as Array<{ owner_id: string; rating: number }>) {
              const oid = row?.owner_id;
              if (!oid) continue;

              if (!map[oid]) map[oid] = { avg: 0, count: 0 };
              map[oid].avg += Number(row.rating ?? 0);
              map[oid].count += 1;
            }

            for (const oid of Object.keys(map)) {
              const entry = map[oid];
              entry.avg = entry.count > 0 ? entry.avg / entry.count : 0;
            }

            setRatingByOwnerId(map);
          }
        }

        if (horseIds.length > 0) {
          const today = todayISODate();

          const [blocksRes, bookingsRes] = await Promise.all([
            supabase
              .from("horse_unavailability")
              .select("id,horse_id,start_date,end_date,reason")
              .in("horse_id", horseIds)
              .gte("end_date", today)
              .order("start_date", { ascending: true }),

            supabase
              .from("borrow_requests")
              .select("id,horse_id,start_date,end_date,status")
              .in("horse_id", horseIds)
              .eq("status", "approved")
              .not("start_date", "is", null)
              .not("end_date", "is", null)
              .gte("end_date", today)
              .order("start_date", { ascending: true }),
          ]);

          if (!cancelled) {
            if (blocksRes.error) throw blocksRes.error;
            if (bookingsRes.error) throw bookingsRes.error;

            const blocks = (blocksRes.data ?? []) as BlockRow[];
            const bookings = (bookingsRes.data ?? []) as BookingRow[];

            const merged = [
              ...blocks.map((b) => ({
                horseId: b.horse_id,
                kind: "blocked" as const,
                startDate: b.start_date,
                endDate: b.end_date,
                label: b.reason?.trim() ? b.reason.trim() : "Blocked",
              })),
              ...bookings.map((br) => ({
                horseId: br.horse_id,
                kind: "booking" as const,
                startDate: br.start_date,
                endDate: br.end_date,
                label: "Approved booking",
              })),
            ].sort((a, b) => a.startDate.localeCompare(b.startDate));

            const byHorse: Record<string, NextRange | null> = {};
            for (const id of horseIds) byHorse[id] = null;

            for (const r of merged) {
              if (!byHorse[r.horseId]) {
                byHorse[r.horseId] = {
                  kind: r.kind,
                  startDate: r.startDate,
                  endDate: r.endDate,
                  label: r.label,
                };
              }
            }

            setNextByHorseId(byHorse);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load browse data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function ownerLabel(ownerId: string) {
    const p = profilesById[ownerId];
    return (
      (p?.display_name && p.display_name.trim()) ||
      (p?.full_name && p.full_name.trim()) ||
      "Owner"
    );
  }

  const mapHorses = useMemo(
    () =>
      horses.map((h) => {
        const rating = ratingByOwnerId[h.owner_id] ?? { avg: 0, count: 0 };
        const isOwn = !!viewerId && h.owner_id === viewerId;

        return {
          id: h.id,
          owner_id: h.owner_id,
          name: h.name,
          location: h.location,
          lat: h.lat,
          lng: h.lng,
          image_url: h.image_url,
          rating_avg: rating.avg,
          rating_count: rating.count,
          is_own_listing: isOwn,
          can_request: !isOwn,
        };
      }),
    [horses, ratingByOwnerId, viewerId]
  );

  return (
    <div className="pmp-pageShell">
      <div className="pmp-mobilePageHeader">
        <div>
          <div className="pmp-kicker">Marketplace</div>
          <h1 className="pmp-pageTitle">Browse horses</h1>
        </div>
      </div>

      <section className="pmp-sectionCard pmp-mapSection">
        <div className="pmp-sectionHeader">
          <div>
            <div className="pmp-kicker">Discover</div>
            <h2 className="pmp-sectionTitle">Explore horses near you</h2>
          </div>
          <div className="pmp-mutedText">Tap a pin or card to view more.</div>
        </div>

        {loading ? <div className="pmp-mutedText">Loading marketplace…</div> : null}
        {error ? <div className="pmp-errorBanner">{error}</div> : null}

        <div className="pmp-mapCard">
          <HorseMap horses={mapHorses} userLocation={null} highlightedId={null} />
        </div>
      </section>

      <section className="pmp-sectionCard">
        <div className="pmp-sectionHeader">
          <div>
            <div className="pmp-kicker">Listings</div>
            <h3 className="pmp-sectionTitle">Available horses</h3>
          </div>
          <div className="pmp-mutedText">{horses.length} listing(s)</div>
        </div>

        {loading ? (
          <div className="pmp-mutedText">Loading listings…</div>
        ) : horses.length === 0 ? (
          <div className="pmp-emptyState">
            <div className="pmp-emptyIcon">🗺️</div>
            <div className="pmp-emptyTitle">No horses available yet</div>
            <div className="pmp-emptyText">Check back soon for new listings in the marketplace.</div>
          </div>
        ) : (
          <div className="pmp-horizontalCards">
            {horses.map((horse) => {
              const next = nextByHorseId[horse.id] ?? null;
              const rating = ratingByOwnerId[horse.owner_id] ?? { avg: 0, count: 0 };
              const hasRating = rating.count > 0;
              const isOwnHorse = !!viewerId && horse.owner_id === viewerId;

              return (
                <article key={horse.id} className="pmp-marketplaceCard">
                  <div className="pmp-marketplaceImageWrap">
                    {horse.image_url ? (
                      <img
                        src={horse.image_url}
                        alt={horse.name?.trim() || "Horse"}
                        className="pmp-marketplaceImage"
                      />
                    ) : (
                      <div className="pmp-marketplaceImageFallback">🐎</div>
                    )}
                  </div>

                  <div className="pmp-marketplaceBody">
                    <div className="pmp-marketplaceTop">
                      <div>
                        <h4 className="pmp-horseName">{horse.name?.trim() || "Untitled horse"}</h4>
                        <div className="pmp-mutedText">{horse.location?.trim() || "Location coming soon"}</div>
                      </div>
                    </div>

                    <div className="pmp-ratingRow">
                      <StarRating value={hasRating ? Number(rating.avg.toFixed(1)) : 0} readOnly size={18} />
                      <span className="pmp-mutedText">
                        {hasRating ? `${rating.avg.toFixed(1)} (${rating.count})` : "No reviews"}
                      </span>
                    </div>

                    <div className="pmp-ownerLine">
                      Owner:{" "}
                      <Link href={`/profile/${horse.owner_id}`} className="pmp-inlineLink">
                        {ownerLabel(horse.owner_id)}
                      </Link>
                    </div>

                    <div className="pmp-inlineMeta" style={{ marginTop: 10 }}>
                      {next ? (
                        <>
                          <AvailabilityBadge
                            label={next.kind === "blocked" ? "Blocked" : "Booked"}
                            tone={next.kind === "blocked" ? "warn" : "info"}
                          />
                          <span>
                            {next.startDate} → {next.endDate}
                          </span>
                        </>
                      ) : (
                        <AvailabilityBadge label="No upcoming blocks" tone="neutral" />
                      )}
                    </div>

                    <div className="pmp-cardActions">
                      <Link href={`/horse/${horse.id}`} className="pmp-ctaSecondary">
                        View horse
                      </Link>

                      {isOwnHorse ? (
                        <div className="pmp-ownerPill">Your listing</div>
                      ) : (
                        <Link href={`/request?horseId=${horse.id}`} className="pmp-ctaPrimary">
                          Request ride
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}