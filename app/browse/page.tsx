'use client';

import {
  GoogleMap,
  Marker,
  InfoWindow,
  useLoadScript,
} from '@react-google-maps/api';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Horse = {
  id: string;
  name: string | null;
  lat: number | null;
  lng: number | null;
  owner_id?: string | null; // IMPORTANT: allow owner_id if your browse query includes it
  distance?: number;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
};

export default function HorseMap({
  horses,
  userLocation = null,
  highlightedId = null,
}: {
  horses: Horse[];
  userLocation?: { lat: number; lng: number } | null;
  highlightedId?: string | null;
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileMini>>({});

  const center = useMemo(() => {
    if (userLocation) return userLocation;
    return { lat: 51.505, lng: -0.09 };
  }, [userLocation]);

  const horsesById = useMemo(() => {
    const map = new Map<string, Horse>();
    for (const h of horses) map.set(h.id, h);
    return map;
  }, [horses]);

  const ownerIds = useMemo(() => {
    const set = new Set<string>();
    for (const h of horses) {
      const oid = h.owner_id ?? null;
      if (oid) set.add(oid);
    }
    return Array.from(set);
  }, [horses]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      if (ownerIds.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id,display_name,full_name')
        .in('id', ownerIds);

      if (cancelled) return;
      if (error) return;

      const map: Record<string, ProfileMini> = {};
      for (const p of (data ?? []) as ProfileMini[]) map[p.id] = p;
      setProfilesById(map);
    }

    loadProfiles();
    return () => {
      cancelled = true;
    };
  }, [ownerIds]);

  function ownerLabel(ownerId?: string | null) {
    if (!ownerId) return 'Owner';
    const p = profilesById[ownerId];
    return (p?.display_name && p.display_name.trim()) || (p?.full_name && p.full_name.trim()) || 'Owner';
  }

  if (!isLoaded) return <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Loading map…</div>;

  const selectedHorse = selectedId ? horsesById.get(selectedId) ?? null : null;

  return (
    <GoogleMap
      zoom={7}
      center={center}
      mapContainerStyle={{ width: '100%', height: '600px' }}
    >
      {horses.map((horse) => {
        if (!horse.lat || !horse.lng) return null;

        return (
          <Marker
            key={horse.id}
            position={{ lat: horse.lat, lng: horse.lng }}
            onClick={() => setSelectedId(horse.id)}
            icon={
              highlightedId === horse.id
                ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                : undefined
            }
          />
        );
      })}

      {selectedHorse && selectedHorse.lat && selectedHorse.lng ? (
        <InfoWindow
          position={{ lat: selectedHorse.lat, lng: selectedHorse.lng }}
          onCloseClick={() => setSelectedId(null)}
        >
          <div style={{ maxWidth: 260 }}>
            {/* OWNER PROFILE NAME (requested) */}
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {ownerLabel(selectedHorse.owner_id)}
            </div>

            {/* Keep horse listing name as secondary */}
            <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(0,0,0,0.7)' }}>
              Listing: {selectedHorse.name ?? 'Horse'}
            </div>

            {typeof selectedHorse.distance === 'number' ? (
              <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                {selectedHorse.distance.toFixed(1)} miles away
              </div>
            ) : null}

            {/* REQUEST LINK (requested) */}
            <div style={{ marginTop: 10 }}>
              <Link
                href={`/request?horseId=${selectedHorse.id}`}
                style={{
                  display: 'inline-block',
                  border: '1px solid rgba(0,0,0,0.14)',
                  background: 'black',
                  color: 'white',
                  padding: '8px 10px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 750,
                }}
              >
                Request →
              </Link>
            </div>
          </div>
        </InfoWindow>
      ) : null}
    </GoogleMap>
  );
}
