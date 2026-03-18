'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AvailabilityBadge } from '@/components/AvailabilityBadge';

const palette = {
  forest: '#1F3D2B',
  navy: '#1F2A44',
};

type HorseRow = { id: string; name: string | null };

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

type UnifiedRange = {
  kind: 'blocked' | 'booking';
  horseId: string;
  startDate: string;
  endDate: string;
  label: string;
  sourceId: string;
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

const btn = (kind: 'primary' | 'secondary') =>
  ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 14,
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 950,
    whiteSpace: 'nowrap',
    border: '1px solid rgba(31,42,68,0.16)',
    background: kind === 'primary' ? `linear-gradient(180deg, ${palette.forest}, #173223)` : 'rgba(255,255,255,0.72)',
    color: kind === 'primary' ? 'white' : palette.navy,
    boxShadow: kind === 'primary' ? '0 14px 34px rgba(31,61,43,0.18)' : '0 14px 34px rgba(31,42,68,0.08)',
    minHeight: 44,
  }) as React.CSSProperties;

export default function OwnerDashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [ranges, setRanges] = useState<UnifiedRange[]>([]);

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
        if (!user) throw new Error('Not authenticated');

        const horsesRes = await supabase
          .from('horses')
          .select('id,name')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (horsesRes.error) throw horsesRes.error;
        const horseRows = (horsesRes.data ?? []) as HorseRow[];
        if (cancelled) return;
        setHorses(horseRows);

        const horseIds = horseRows.map((h) => h.id);
        if (horseIds.length === 0) {
          setRanges([]);
          setLoading(false);
          return;
        }

        const today = todayISODate();

        const [blocksRes, bookingsRes] = await Promise.all([
          supabase
            .from('horse_unavailability')
            .select('id,horse_id,start_date,end_date,reason')
            .in('horse_id', horseIds)
            .not('start_date', 'is', null)
            .not('end_date', 'is', null)
            .gte('end_date', today)
            .order('start_date', { ascending: true }),

          supabase
            .from('borrow_requests')
            .select('id,horse_id,start_date,end_date,status')
            .in('horse_id', horseIds)
            .eq('status', 'approved')
            .not('start_date', 'is', null)
            .not('end_date', 'is', null)
            .gte('end_date', today)
            .order('start_date', { ascending: true }),
        ]);

        if (cancelled) return;

        if (blocksRes.error) throw blocksRes.error;
        if (bookingsRes.error) throw bookingsRes.error;

        const blocks = (blocksRes.data ?? []) as BlockRow[];
        const bookings = (bookingsRes.data ?? []) as BookingRow[];

        const unified: UnifiedRange[] = [
          ...blocks.map((b) => ({
            kind: 'blocked' as const,
            horseId: b.horse_id,
            startDate: b.start_date,
            endDate: b.end_date,
            label: b.reason?.trim() ? b.reason.trim() : 'Blocked',
            sourceId: b.id,
          })),
          ...bookings.map((br) => ({
            kind: 'booking' as const,
            horseId: br.horse_id,
            startDate: br.start_date,
            endDate: br.end_date,
            label: 'Approved booking',
            sourceId: br.id,
          })),
        ].sort((a, b) => a.startDate.localeCompare(b.startDate));

        setRanges(unified);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load overview.');
        if (!cancelled) setRanges([]);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const horseNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of horses) m.set(h.id, h.name ?? 'Horse');
    return m;
  }, [horses]);

  const upcoming = useMemo(() => ranges.slice(0, 8), [ranges]);
  const bookingCount = useMemo(() => ranges.filter((r) => r.kind === 'booking').length, [ranges]);
  const blockedCount = useMemo(() => ranges.filter((r) => r.kind === 'blocked').length, [ranges]);

  return (
    <div className="pmp-pageShell">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div className="pmp-kicker">Owner dashboard</div>
          <h1 className="pmp-pageTitle">Owner Overview</h1>
          <div className="pmp-mutedText" style={{ marginTop: 6 }}>
            Upcoming blocks and approved bookings across your horses.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/dashboard/owner/horses" style={btn('secondary')}>
            Horses
          </Link>
          <Link href="/dashboard/owner/requests" style={btn('secondary')}>
            Requests
          </Link>
          <Link href="/dashboard/owner/horses/add" style={btn('primary')}>
            Add a horse →
          </Link>
        </div>
      </div>

      <section className="pmp-statGrid" style={{ marginTop: 16 }}>
        <article className="pmp-statCard">
          <div className="pmp-statLabel">Active horses</div>
          <div className="pmp-statValue">{horses.length}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">Upcoming bookings</div>
          <div className="pmp-statValue">{bookingCount}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">Upcoming blocks</div>
          <div className="pmp-statValue">{blockedCount}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">Trust tip</div>
          <div className="pmp-mutedText" style={{ marginTop: 10 }}>
            Keep your location, horse photos, and profile details up to date.
          </div>
        </article>
      </section>

      {loading ? <div style={{ marginTop: 16 }} className="pmp-mutedText">Loading…</div> : null}
      {error ? <div className="pmp-errorBanner" style={{ marginTop: 16 }}>{error}</div> : null}

      <section className="pmp-sectionCard" style={{ marginTop: 12 }}>
        <div className="pmp-sectionHeader">
          <div>
            <div className="pmp-kicker">Upcoming activity</div>
            <h3 className="pmp-sectionTitle">Your next dates</h3>
          </div>
          <div className="pmp-mutedText">
            {ranges.length} upcoming range{ranges.length === 1 ? '' : 's'}
          </div>
        </div>

        {!loading && !error && upcoming.length === 0 ? (
          <div className="pmp-emptyState">
            <div className="pmp-emptyIcon">📅</div>
            <div className="pmp-emptyTitle">No upcoming activity</div>
            <div className="pmp-emptyText">
              Add a horse or update availability to start receiving and managing requests.
            </div>
            <Link href="/dashboard/owner/horses/add" className="pmp-ctaPrimary">
              Add your next horse
            </Link>
          </div>
        ) : (
          <div className="pmp-listStack">
            {upcoming.map((r) => (
              <div
                key={`${r.kind}-${r.sourceId}`}
                className="pmp-horseRowCard"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <AvailabilityBadge label={r.kind === 'blocked' ? 'Blocked' : 'Booking'} tone={r.kind === 'blocked' ? 'warn' : 'info'} />
                    <div style={{ fontWeight: 950, color: palette.navy }}>
                      {horseNameById.get(r.horseId) ?? 'Horse'}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(0,0,0,0.70)' }}>
                    <span style={{ fontWeight: 900 }}>{r.startDate}</span> → <span style={{ fontWeight: 900 }}>{r.endDate}</span>
                    {' — '}
                    {r.label}
                  </div>
                </div>

                <Link href={`/dashboard/owner/horses/${r.horseId}/availability`} className="pmp-ctaSecondary">
                  Availability
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}