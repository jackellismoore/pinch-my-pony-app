'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Range = {
  kind: 'blocked' | 'booking';
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD (inclusive)
  label: string;
};

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd; // inclusive
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function AvailabilityConflictNotice({
  horseId,
  startDate,
  endDate,
  onConflictChange,
}: {
  horseId: string;
  startDate: string;
  endDate: string;
  onConflictChange?: (blockedOrLoading: boolean) => void;
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

        const bookings: Range[] = (bookingsRes.data ?? []).map((r: any) => ({
          kind: 'booking',
          startDate: r.start_date,
          endDate: r.end_date,
          label: 'Approved booking',
        }));

        setRanges([...blocked, ...bookings].sort((a, b) => a.startDate.localeCompare(b.startDate)));
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

  const conflict = useMemo(() => {
    if (!startDate || !endDate) return { has: false, matches: [] as Range[] };
    if (startDate > endDate) return { has: true, matches: [] as Range[] };

    const matches = ranges.filter((r) => rangesOverlap(startDate, endDate, r.startDate, r.endDate));
    return { has: matches.length > 0, matches };
  }, [startDate, endDate, ranges]);

  // ✅ FIX: compute inline and pass directly (no missing identifier)
  useEffect(() => {
    const shouldBlock =
      loading ||
      !!error ||
      conflict.has ||
      (!!startDate && !!endDate && startDate > endDate);

    onConflictChange?.(shouldBlock);
  }, [loading, error, conflict.has, startDate, endDate, onConflictChange]);

  if (!startDate || !endDate) {
    return <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.60)' }}>Select dates to check availability.</div>;
  }

  if (startDate > endDate) {
    return (
      <div
        style={{
          border: '1px solid rgba(255,0,0,0.25)',
          background: 'rgba(255,0,0,0.06)',
          padding: 12,
          borderRadius: 12,
          fontSize: 13,
        }}
      >
        End date must be after or equal to start date.
      </div>
    );
  }

  if (loading) {
    return <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.60)' }}>Checking availability…</div>;
  }

  if (error) {
    return (
      <div
        style={{
          border: '1px solid rgba(255,0,0,0.25)',
          background: 'rgba(255,0,0,0.06)',
          padding: 12,
          borderRadius: 12,
          fontSize: 13,
        }}
      >
        Availability check failed: {error}
      </div>
    );
  }

  if (!conflict.has) {
    return (
      <div
        style={{
          border: '1px solid rgba(0,0,0,0.10)',
          background: 'rgba(0,0,0,0.03)',
          padding: 12,
          borderRadius: 12,
          fontSize: 13,
          color: 'rgba(0,0,0,0.75)',
        }}
      >
        ✅ Dates look available.
      </div>
    );
  }

  const first = conflict.matches[0];

  return (
    <div
      style={{
        border: '1px solid rgba(255,0,0,0.25)',
        background: 'rgba(255,0,0,0.06)',
        padding: 12,
        borderRadius: 12,
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 900, color: 'rgba(160,0,0,0.95)' }}>
        Unavailable — overlaps {conflict.matches.length} range{conflict.matches.length === 1 ? '' : 's'}.
      </div>

      <div style={{ marginTop: 6, color: 'rgba(0,0,0,0.75)' }}>
        First conflict: <span style={{ fontWeight: 850 }}>{first.startDate} → {first.endDate}</span> ({first.label})
      </div>
    </div>
  );
}
