"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";

type HorseRow = {
  id: string;
  name: string | null;
  is_active: boolean | null;
};

type BlockRow = {
  id: string;
  horse_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
};

type BookingRow = {
  id: string;
  horse_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

type UnifiedRange = {
  kind: "blocked" | "booking";
  horseId: string;
  startDate: string;
  endDate: string;
  label: string;
  sourceId: string;
};

const palette = {
  forest: "#1f3d2b",
  saddle: "#8b5e3c",
  cream: "#f5f1e8",
  navy: "#1f2a44",
  gold: "#c8a24d",
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function OwnerDashboardHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [ranges, setRanges] = useState<UnifiedRange[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        if (!cancelled) {
          setError(userErr?.message ?? "Not authenticated");
          setLoading(false);
        }
        return;
      }

      const { data: horsesData, error: horsesErr } = await supabase
        .from("horses")
        .select("id,name,is_active")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (horsesErr) {
        if (!cancelled) {
          setError(horsesErr.message);
          setLoading(false);
        }
        return;
      }

      const horseRows = (horsesData ?? []) as HorseRow[];
      const horseIds = horseRows.map((h) => h.id);

      let merged: UnifiedRange[] = [];

      if (horseIds.length > 0) {
        const today = todayISODate();

        const [blocksRes, bookingsRes] = await Promise.all([
          supabase
            .from("horse_unavailability")
            .select("id,horse_id,start_date,end_date,reason,created_at")
            .in("horse_id", horseIds)
            .gte("end_date", today)
            .order("start_date", { ascending: true }),

          supabase
            .from("borrow_requests")
            .select("id,horse_id,start_date,end_date,created_at")
            .in("horse_id", horseIds)
            .eq("status", "approved")
            .not("start_date", "is", null)
            .not("end_date", "is", null)
            .gte("end_date", today)
            .order("start_date", { ascending: true }),
        ]);

        if (blocksRes.error) {
          if (!cancelled) {
            setError(blocksRes.error.message);
            setLoading(false);
          }
          return;
        }

        if (bookingsRes.error) {
          if (!cancelled) {
            setError(bookingsRes.error.message);
            setLoading(false);
          }
          return;
        }

        merged = [
          ...((blocksRes.data ?? []) as BlockRow[]).map((b) => ({
            kind: "blocked" as const,
            horseId: b.horse_id,
            startDate: b.start_date,
            endDate: b.end_date,
            label: b.reason?.trim() ? b.reason.trim() : "Blocked",
            sourceId: b.id,
          })),
          ...((bookingsRes.data ?? []) as BookingRow[]).map((b) => ({
            kind: "booking" as const,
            horseId: b.horse_id,
            startDate: b.start_date,
            endDate: b.end_date,
            label: "Approved booking",
            sourceId: b.id,
          })),
        ].sort((a, b) => a.startDate.localeCompare(b.startDate));
      }

      if (!cancelled) {
        setHorses(horseRows);
        setRanges(merged);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const horseCount = horses.length;
  const activeCount = horses.filter((h) => h.is_active !== false).length;
  const inactiveCount = horses.filter((h) => h.is_active === false).length;
  const upcomingCount = ranges.length;

  const nextByHorse = useMemo(() => {
    const map: Record<string, UnifiedRange | undefined> = {};
    for (const range of ranges) {
      if (!map[range.horseId]) map[range.horseId] = range;
    }
    return map;
  }, [ranges]);

  return (
    <div className="pmp-pageShell">
      <div className="pmp-mobilePageHeader">
        <div>
          <div className="pmp-kicker">Owner dashboard</div>
          <h1 className="pmp-pageTitle">Your horses</h1>
        </div>
        <Link href="/owner/add-horse" className="pmp-primaryCta">
          + Add horse
        </Link>
      </div>

      {error ? <div className="pmp-errorBanner">{error}</div> : null}

      <section className="pmp-heroCard">
        <div>
          <div className="pmp-kicker">Pinch My Pony</div>
          <h2 className="pmp-heroTitle">Manage listings, requests and availability in one place.</h2>
          <p className="pmp-heroText">
            This version is rebuilt for mobile so you can manage your horses quickly from your phone.
          </p>
        </div>

        <div className="pmp-heroActions">
          <Link href="/owner/add-horse" className="pmp-ctaPrimary">
            Add a horse
          </Link>
          <Link href="/browse" className="pmp-ctaSecondary">
            View marketplace
          </Link>
        </div>
      </section>

      <section className="pmp-statGrid">
        <article className="pmp-statCard">
          <div className="pmp-statLabel">My horses</div>
          <div className="pmp-statValue">{loading ? "…" : horseCount}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">Active</div>
          <div className="pmp-statValue">{loading ? "…" : activeCount}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">Inactive</div>
          <div className="pmp-statValue">{loading ? "…" : inactiveCount}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">Upcoming blocks</div>
          <div className="pmp-statValue">{loading ? "…" : upcomingCount}</div>
        </article>
      </section>

      <section className="pmp-actionGrid">
        <Link href="/owner/add-horse" className="pmp-actionCard">
          <div className="pmp-actionIcon">🐎</div>
          <div>
            <div className="pmp-actionTitle">Add a horse</div>
            <div className="pmp-actionText">Create a new listing for riders.</div>
          </div>
        </Link>

        <Link href="/browse" className="pmp-actionCard">
          <div className="pmp-actionIcon">🗺️</div>
          <div>
            <div className="pmp-actionTitle">View marketplace</div>
            <div className="pmp-actionText">See how your listings appear to riders.</div>
          </div>
        </Link>

        <Link href="/messages" className="pmp-actionCard">
          <div className="pmp-actionIcon">💬</div>
          <div>
            <div className="pmp-actionTitle">Open messages</div>
            <div className="pmp-actionText">Reply to riders and manage enquiries.</div>
          </div>
        </Link>

        <Link href="/profile" className="pmp-actionCard">
          <div className="pmp-actionIcon">👤</div>
          <div>
            <div className="pmp-actionTitle">Profile & membership</div>
            <div className="pmp-actionText">Update account details and settings.</div>
          </div>
        </Link>
      </section>

      <section className="pmp-sectionCard">
        <div className="pmp-sectionHeader">
          <div>
            <div className="pmp-kicker">Listings</div>
            <h3 className="pmp-sectionTitle">Your current horses</h3>
          </div>
        </div>

        {loading ? (
          <div className="pmp-mutedText">Loading your horses…</div>
        ) : horses.length === 0 ? (
          <div className="pmp-emptyState">
            <div className="pmp-emptyIcon">🐴</div>
            <div className="pmp-emptyTitle">No horses listed yet</div>
            <div className="pmp-emptyText">Add your first horse to start receiving requests.</div>
            <Link href="/owner/add-horse" className="pmp-ctaPrimary">
              Add your first horse
            </Link>
          </div>
        ) : (
          <div className="pmp-listStack">
            {horses.map((horse) => {
              const next = nextByHorse[horse.id];

              return (
                <article key={horse.id} className="pmp-horseRowCard">
                  <div className="pmp-horseRowMain">
                    <div className="pmp-horseThumb">{horse.name?.trim()?.charAt(0) || "H"}</div>

                    <div className="pmp-horseRowText">
                      <div className="pmp-horseRowTop">
                        <h4 className="pmp-horseName">{horse.name?.trim() || "Untitled horse"}</h4>
                        <span
                          className={`pmp-statusChip ${
                            horse.is_active === false ? "is-inactive" : "is-active"
                          }`}
                        >
                          {horse.is_active === false ? "Inactive" : "Active"}
                        </span>
                      </div>

                      <div className="pmp-inlineMeta">
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
                    </div>
                  </div>

                  <div className="pmp-rowActions">
                    <Link href={`/horse/${horse.id}`} className="pmp-ctaSecondary">
                      View
                    </Link>
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