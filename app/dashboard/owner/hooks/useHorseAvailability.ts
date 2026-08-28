'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type UnavailabilityRow = {
  id: string;
  horse_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
};

type ApprovedBookingRow = {
  id: string;
  horse_id: string;
  borrower_id: string;
  status: 'approved' | 'accepted';
  start_date: string;
  end_date: string;
  created_at: string;
};

export type DateRange = {
  startDate: string;
  endDate: string;
  kind: 'blocked' | 'booking';
  label?: string;
  sourceId: string;
};

export function rangesOverlapInclusive(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function hasOverlapInclusive(
  proposedStart: string,
  proposedEnd: string,
  ranges: Pick<DateRange, 'startDate' | 'endDate'>[]
) {
  return ranges.some((r) => rangesOverlapInclusive(proposedStart, proposedEnd, r.startDate, r.endDate));
}

export function useHorseAvailability(horseId: string | null) {
  const [blocked, setBlocked] = useState<UnavailabilityRow[]>([]);
  const [bookings, setBookings] = useState<ApprovedBookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!horseId) return;

    setLoading(true);
    setError(null);

    const [blockedRes, bookingsRes] = await Promise.all([
      supabase
        .from('horse_unavailability')
        .select('id,horse_id,owner_id,start_date,end_date,reason,created_at')
        .eq('horse_id', horseId)
        .not('start_date', 'is', null)
        .not('end_date', 'is', null)
        .order('start_date', { ascending: true }),

      supabase
        .from('borrow_requests')
        .select('id,horse_id,borrower_id,status,start_date,end_date,created_at')
        .eq('horse_id', horseId)
        .in('status', ['approved', 'accepted'])
        .not('start_date', 'is', null)
        .not('end_date', 'is', null)
        .order('start_date', { ascending: true }),
    ]);

    if (blockedRes.error) {
      setError(blockedRes.error.message);
      setLoading(false);
      return;
    }
    if (bookingsRes.error) {
      setError(bookingsRes.error.message);
      setLoading(false);
      return;
    }

    setBlocked((blockedRes.data ?? []) as UnavailabilityRow[]);
    setBookings((bookingsRes.data ?? []) as ApprovedBookingRow[]);
    setLoading(false);
  }, [horseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!horseId) return;
    const blocksChannel = supabase
      .channel(`availability-blocks:${horseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'horse_unavailability', filter: `horse_id=eq.${horseId}` }, () => void refresh())
      .subscribe();
    const bookingsChannel = supabase
      .channel(`availability-bookings:${horseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrow_requests', filter: `horse_id=eq.${horseId}` }, () => void refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(blocksChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [horseId, refresh]);

  const unavailableRanges: DateRange[] = useMemo(() => {
    const blockedRanges: DateRange[] = blocked.map((b) => ({
      startDate: b.start_date,
      endDate: b.end_date,
      kind: 'blocked',
      label: b.reason ?? 'Blocked',
      sourceId: b.id,
    }));

    const bookingRanges: DateRange[] = bookings.map((br) => ({
      startDate: br.start_date,
      endDate: br.end_date,
      kind: 'booking',
      label: 'Approved booking',
      sourceId: br.id,
    }));

    return [...blockedRanges, ...bookingRanges].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [blocked, bookings]);

  const addBlockedRange = useCallback(
    async (input: { startDate: string; endDate: string; reason?: string }) => {
      if (!horseId) throw new Error('horseId missing');

      const { startDate, endDate, reason } = input;
      if (!startDate || !endDate) throw new Error('Start and end dates required');
      if (startDate > endDate) throw new Error('Start date must be <= end date');

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error('Not authenticated');

      const { error: insertErr } = await supabase.from('horse_unavailability').insert({
        horse_id: horseId,
        owner_id: user.id,
        start_date: startDate,
        end_date: endDate,
        reason: reason?.trim() ? reason.trim() : null,
      });

      if (insertErr) throw insertErr;
      await refresh();
    },
    [horseId, refresh]
  );

  const deleteBlockedRange = useCallback(
    async (blockId: string) => {
      const { error: delErr } = await supabase.from('horse_unavailability').delete().eq('id', blockId);
      if (delErr) throw delErr;
      await refresh();
    },
    [refresh]
  );

  return {
    blocked,
    bookings,
    unavailableRanges,
    loading,
    error,
    refresh,
    addBlockedRange,
    deleteBlockedRange,
  };
}
