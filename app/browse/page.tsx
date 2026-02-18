'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import HorseMap from '@/components/HorseMap';
import { supabase } from '@/lib/supabaseClient';
import { AvailabilityBadge } from '@/components/AvailabilityBadge';

type HorseRow = {
  id: string;
  owner_id: string;
  name: string | null;
  is_active: boolean | null;
  // your map already pins horses, so you likely have location fields; we don't depend on them here
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
  kind: 'blocked' | 'booking';
  startDate: string;
  endDate: string;
  label: string;
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function BrowsePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileMini>>({});
  const [nextByHorseId, setNextByHorseId] = useState<Record<string, NextRange | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: horsesData, error: horsesErr } = await supabase
        .from('horses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (horsesErr) {
        setError(horsesErr.message);
        setLoading(false);
        return;
      }

      const horseRows = (horsesData ?? []) as HorseRow[];
      setHorses(horseRows);

      const ownerIds = Array.from(new Set(horseRows.map((h) => h.owner_id).filter(Boolean)));
      const horseIds = horseRows.map((h) => h.id);

      if (ownerIds.length > 0) {
        const { data: profData } = await supabase
          .from('profiles')
          .select('id,display_name,full_name')
          .in('id', ownerIds);

        const map: Record<string, ProfileMini> = {};
        for (const p of (profData ?? []) as ProfileMini[]) map[p.id] = p;
        if (!cancelled) setProfilesById(map);
      }

      // Availability preview: compute earliest upcoming blocked/booking per horse
      if (horseIds.length > 0) {
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

        if (!cancelled) {
          if (blocksRes.error) setError(blocksRes.error.message);
          if (bookingsRes.error) setError(bookingsRes.error.message);

          const blocks = (blocksRes.data ?? []) as BlockRow[];
          const bookings = (bookingsRes.data ?? []) as BookingRow[];

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

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function ownerLabel(ownerId: string) {
    const p = profilesById[ownerId];
    return (p?.display_name && p.display_name.trim()) || (p?.full_name && p.full_name.trim()) || 'Owner';
  }

  const mapHorses = useMemo(() => horses as any[], [horses]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Browse</h1>
      <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
        Click a pin (or Request) to book dates. Availability is enforced.
      </div>

      {loading ? (
        <div style={{ marginTop: 14, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Loading…</div>
      ) : null}

      {error ? (
        <div
          style={{
            marginTop: 14,
            border: '1px solid rgba(255,0,0,0.25)',
            background: 'rgba(255,0,0,0.06)',
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
