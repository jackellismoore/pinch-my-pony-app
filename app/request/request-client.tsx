'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import HorseMap from '@/components/HorseMap';
import AvailabilityRanges from '@/components/AvailabilityRanges';
import { supabase } from '@/lib/supabaseClient';
import RequestForm from './request-form';

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

function ownerLabel(p: ProfileMini | null) {
  return (p?.display_name && p.display_name.trim()) || (p?.full_name && p.full_name.trim()) || 'Owner';
}

export default function RequestClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const horseId = searchParams.get('horseId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horse, setHorse] = useState<HorseRow | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<ProfileMini | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (!horseId) {
          setHorse(null);
          setOwnerProfile(null);
          setLoading(false);
          return;
        }

        const hRes = await supabase
          .from('horses')
          .select('id,owner_id,name,is_active,lat,lng')
          .eq('id', horseId)
          .single();

        if (cancelled) return;
        if (hRes.error) throw hRes.error;

        const h = (hRes.data ?? null) as HorseRow | null;
        setHorse(h);

        if (!h?.owner_id) {
          setOwnerProfile(null);
          setLoading(false);
          return;
        }

        const pRes = await supabase
          .from('profiles')
          .select('id,display_name,full_name')
          .eq('id', h.owner_id)
          .single();

        if (!cancelled) {
          if (!pRes.error) setOwnerProfile((pRes.data ?? null) as ProfileMini | null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load request details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [horseId]);

  const mapHorses = useMemo(() => {
    if (!horse) return [];
    if (typeof horse.lat !== 'number' || typeof horse.lng !== 'number') return [];

    return [
      {
        id: horse.id,
        name: horse.name ?? 'Horse',
        lat: horse.lat,
        lng: horse.lng,
        owner_id: horse.owner_id,
        owner_label: ownerLabel(ownerProfile),
      },
    ];
  }, [horse, ownerProfile]);

  if (!horseId) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Request</h1>
        <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
          Missing horseId. Go back to <Link href="/browse">Browse</Link>.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Request</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
            Pick dates. Availability is enforced.
          </div>
        </div>

        <button
          onClick={() => router.push('/browse')}
          style={{
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'white',
            padding: '9px 10px',
            borderRadius: 12,
            fontWeight: 900,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ← Browse
        </button>
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

      {horse ? (
        <div
          style={{
            marginTop: 14,
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 14,
            padding: 14,
            background: 'white',
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 16 }}>{ownerLabel(ownerProfile)}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(0,0,0,0.7)' }}>
            Listing: {horse.name ?? 'Horse'}
          </div>
          {horse.owner_id ? (
            <div style={{ marginTop: 10 }}>
              <Link href={`/owner/${horse.owner_id}`} style={{ fontSize: 13 }}>
                View owner profile →
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <HorseMap horses={mapHorses as any} userLocation={null} highlightedId={null} />
      </div>

      <div style={{ marginTop: 14 }}>
        <AvailabilityRanges horseId={horseId} />
      </div>

      <div style={{ marginTop: 14 }}>
        <RequestForm
          horseId={horseId}
          onSuccess={() => {
            router.push('/messages');
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
