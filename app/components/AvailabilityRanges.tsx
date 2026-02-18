'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AvailabilityBadge } from '@/components/AvailabilityBadge';

type Range = {
  kind: 'blocked' | 'booking';
  startDate: string;
  endDate: string;
  label: string;
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AvailabilityRanges({
  horseId,
  limit = 6,
}: {
  horseId: string;
  limit?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ranges, setRanges] = useState<Range[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!horseId) {
        setRanges([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const today = todayISODate();

        const [blocksRes, bookingsRes] = await Promise.all([
          supabase
            .from('horse_unavailability')
            .select('id,start_date,end_date,reason')
            .eq('horse_id', horseId)
            .gte('end_date', today)
            .order('start_date', { ascending: true }),

          supabase
            .from('borrow_requests')
            .select('id,start_date,end_date,status')
            .eq('horse_id', horseId)
            .eq('status', 'approved')
            .not('start_date', 'is', null)
            .not('end_date', 'is', null)
            .gte('end_date', today)
            .order('start_date', { ascending: true }),
        ]);

        if (cancelled) return;

        if (blocksRes.error) throw blocksRes.error;
        if (bookingsRes.error) throw bookingsRes.error;

        const blocked: Range[] = (blocksRes.data ?? []).map((b: any) => ({
          kind: 'blocked',
          startDate: b.start_date,
          endDate: b.end_date,
          label: b.reason?.trim() ? b.reason.trim() : 'Blocked',
        }));

        const booked: Range[] = (bookingsRes.data ?? []).map((r: any) => ({
          kind: 'booking',
          startDate: r.start_date,
          endDate: r.end_date,
          label: 'Approved booking',
        }));

        setRanges([...blocked, ...booked].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load availability.');
        setRanges([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [horseId]);

  const shown = useMemo(() => ranges.slice(0, limit), [ranges, limit]);

  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.10)',
        borderRadius: 14,
        padding: 14,
        background: 'white',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ fontWeight: 950, fontSize: 14 }}>Availability</div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>Unavailable = blocked + approved</div>
      </div>

      {loading ? (
        <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Loading…</div>
      ) : null}

      {error ? (
        <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(180,0,0,0.9)' }}>{error}</div>
      ) : null}

      {!loading && !error && shown.length === 0 ? (
        <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
          No upcoming unavailable ranges.
        </div>
      ) : null}

      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        {shown.map((r, idx) => (
          <div
            key={`${r.kind}-${r.startDate}-${r.endDate}-${idx}`}
            style={{
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <AvailabilityBadge
                  label={r.kind === 'blocked' ? 'Blocked' : 'Booked'}
                  tone={r.kind === 'blocked' ? 'warn' : 'info'}
                />
                <div style={{ fontSize: 13, fontWeight: 850, color: 'rgba(0,0,0,0.85)' }}>
                  {r.startDate} → {r.endDate}
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>{r.label}</div>
            </div>
          </div>
        ))}
      </div>

      {ranges.length > limit ? (
        <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
          Showing {limit} of {ranges.length}
        </div>
      ) : null}
    </div>
  );
}
