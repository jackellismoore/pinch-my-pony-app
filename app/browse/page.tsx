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
        .select('id,owner_id,name,is_active,lat,lng')
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
        const { data: profData, error: profErr } = await supabase
          .from('profiles')
          .select('id,display_name,full_name')
          .in('id', ownerIds);

        if (!cancelled && !profErr) {
          const map: Record<string, ProfileMini> = {};
          for (const p of (profData ?? []) as ProfileMini[]) map[p.id] = p;
          setProfilesById(map);
        }
      }

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

  const mapHorses = useMemo(
    () =>
      horses.map((h) => ({
        id: h.id,
        name: h.name,
        lat: h.lat,
        lng: h.lng,
        owner_id: h.owner_id,
      })),
    [horses]
  );

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Browse</h1>
      <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
        Click a pin to see the owner and request dates.
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
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <HorseMap horses={mapHorses} userLocation={null} highlightedId={null} />
      </div>

      <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
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
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 850, fontSize: 15 }}>
                  {ownerLabel(h.owner_id)}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                  Listing: {h.name ?? 'Horse'}
                </div>

                <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {next ? (
                    <>
                      <AvailabilityBadge
                        label={next.kind === 'blocked' ? 'Blocked' : 'Booked'}
                        tone={next.kind === 'blocked' ? 'warn' : 'info'}
                      />
                      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.7)' }}>
                        Next unavailable:{' '}
                        <span style={{ fontWeight: 750 }}>
                          {next.startDate} → {next.endDate}
                        </span>
                        {' — '}
                        {next.label}
                      </div>
                    </>
                  ) : (
                    <AvailabilityBadge label="No upcoming blocks" tone="neutral" />
                  )}
                </div>
              </div>

              <Link
                href={`/request?horseId=${h.id}`}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  background: 'black',
                  color: 'white',
                  padding: '10px 12px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                Request →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
