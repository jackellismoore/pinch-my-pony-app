'use client';

import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type Horse = {
  id: string;
  name: string | null;
  lat: number | null;
  lng: number | null;
  distance?: number;
  owner_id?: string | null;
};

export default function HorseMap({
  horses,
  userLocation,
  highlightedId,
}: {
  horses: Horse[];
  userLocation: { lat: number; lng: number } | null;
  highlightedId: string | null;
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [selected, setSelected] = useState<string | null>(null);

  const center = useMemo(() => {
    if (userLocation) return userLocation;
    return { lat: 51.505, lng: -0.09 };
  }, [userLocation]);

  const selectedHorse = useMemo(() => {
    if (!selected) return null;
    return horses.find((h) => h.id === selected) ?? null;
  }, [selected, horses]);

  if (!isLoaded) return <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>Loading map…</div>;

  return (
    <GoogleMap zoom={7} center={center} mapContainerStyle={{ width: '100%', height: '520px', borderRadius: 14 }}>
      {horses.map((horse) =>
        horse.lat != null && horse.lng != null ? (
          <Marker
            key={horse.id}
            position={{ lat: horse.lat, lng: horse.lng }}
            onClick={() => setSelected(horse.id)}
            icon={
              highlightedId === horse.id ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' : undefined
            }
          />
        ) : null
      )}

      {selectedHorse && selectedHorse.lat != null && selectedHorse.lng != null ? (
        <InfoWindow
          position={{ lat: selectedHorse.lat, lng: selectedHorse.lng }}
          onCloseClick={() => setSelected(null)}
        >
          <div style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>
              {selectedHorse.name ?? 'Horse'}
            </div>

            {typeof selectedHorse.distance === 'number' ? (
              <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                {selectedHorse.distance.toFixed(1)} miles away
              </div>
            ) : null}

            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedHorse.owner_id ? (
                <Link
                  href={`/owner/${selectedHorse.owner_id}`}
                  style={{
                    border: '1px solid rgba(0,0,0,0.14)',
                    borderRadius: 12,
                    padding: '8px 10px',
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 900,
                    color: 'black',
                    background: 'white',
                  }}
                >
                  Owner profile
                </Link>
              ) : null}

              <Link
                href={`/request?horseId=${selectedHorse.id}`}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  borderRadius: 12,
                  padding: '8px 10px',
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 950,
                  color: 'white',
                  background: 'black',
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
