'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AvailabilityBadge } from '@/components/AvailabilityBadge';

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
};

type BookingRow = {
  id: string;
  horse_id: string;
  start_date: string;
  end_date: string;
};

type NextRange = {
  kind: 'blocked' | 'booking';
  startDate: string;
  endDate: string;
  label: string;
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function OwnerHorsesPage() {
  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [nextByHorseId, setNextByHorseId] = useState<Record<string, NextRange | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) setError(userErr?.message ?? 'Not authenticated');
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error: horsesErr } = await supabase
        .from('horses')
        .select('id,name,is_active')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (horsesErr) {
        setError(horsesErr.message);
        setLoading(false);
        return;
      }

      const horseRows = (data ?? []) as HorseRow[];
      setHorses(horseRows);

      const horseIds = horseRows.map((h) => h.id);
      if (horseIds.length === 0) {
        setNextByHorseId({});
        setLoading(false);
        return;
      }

      const today = todayISODate();

      const [blocksRes, bookingsRes] = await Promise.all([
        supabase
          .from('horse_unavailability')
          .select('id,horse_id,start_date,end_date,reason')
          .in('horse_id', horseIds)
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

      if (blocksRes.error) {
        setError(blocksRes.error.message);
        setLoading(false);
        return;
      }
      if (bookingsRes.error) {
        setError(bookingsRes.error.message);
        setLoading(false);
        return;
      }

      const blocks = (blocksRes.data ?? []) as BlockRow[];
      const bookings = (bookingsRes.data ?? []) as BookingRow[];

      // Build earliest upcoming range per horse
      const byHorse: Record<string, NextRange | null> = {};
      for (const id of horseIds) byHorse[id] = null;

      const merged = [
        ...blocks.map((b) => ({
          horseId: b.horse_id,
          kind: 'blocked' as const,
          startDate: b.start_date,
          endDate: b.end_date,
          label: b.reason?.trim() ? b.reason.trim() : 'Blocked',
        })),
        ...bookings.map((br) => ({
          horseId: br.horse_id,
          kind: 'booking' as const,
          startDate: br.start_date,
          endDate: br.end_date,
          label: 'Approved booking',
        })),
      ].sort((a, b) => a.startDate.localeCompare(b.startDate));

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
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasHorses = useMemo(() => horses.length > 0, [horses.length]);

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Your Horses</h1>
          <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
            Manage listings and availability blocks.
          </div>
        </div>

        <Link
          href="/dashboard/owner/horses/add"
          style={{
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'black',
            color: 'white',
            padding: '10px 14px',
            borderRadius: 12,
            textDecoration: 'none',
            fontWeight: 650,
            whiteSpace: 'nowrap',
          }}
        >
          + Add Horse
        </Link>
      </div>

      {loading ? (
        <div style={{ marginTop: 16, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Loading…</div>
      ) : null}

      {error ? (
        <div
          style={{
            marginTop: 16,
            border: '1px solid rgba(255,0,0,0.25)',
            background: 'rgba(255,0,0,0.06)',
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && !hasHorses ? (
        <div style={{ marginTop: 16, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
          No horses yet. Click “Add Horse”.
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {horses.map((h) => {
          const next = nextByHorseId[h.id] ?? null;

          return (
            <div
              key={h.id}
              style={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 14,
                padding: 14,
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.name ?? 'Unnamed horse'}
                </div>

                <div style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                    Status: {h.is_active ? 'Active' : 'Inactive'}
                  </div>

                  {next ? (
                    <>
                      <AvailabilityBadge
                        label={next.kind === 'blocked' ? 'Blocked' : 'Booking'}
                        tone={next.kind === 'blocked' ? 'warn' : 'info'}
                      />
                      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.7)' }}>
                        Next unavailable: <span style={{ fontWeight: 700 }}>{next.startDate} → {next.endDate}</span>
                        {' — '}
                        {next.label}
                      </div>
                    </>
                  ) : (
                    <AvailabilityBadge label="No upcoming blocks" tone="neutral" />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Link
                  href={`/dashboard/owner/horses/${h.id}/edit`}
                  style={{
                    border: '1px solid rgba(0,0,0,0.14)',
                    background: 'white',
                    padding: '8px 10px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: 'black',
                    fontSize: 13,
                    fontWeight: 650,
                  }}
                >
                  Edit
                </Link>

                <Link
                  href={`/dashboard/owner/horses/${h.id}/availability`}
                  style={{
                    border: '1px solid rgba(0,0,0,0.14)',
                    background: 'white',
                    padding: '8px 10px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: 'black',
                    fontSize: 13,
                    fontWeight: 650,
                  }}
                >
                  Availability
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
