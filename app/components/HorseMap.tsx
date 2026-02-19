'use client';

import Link from 'next/link';
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';
import { useMemo, useState } from 'react';

export type HorseMapHorse = {
  id: string;
  name: string | null;
  lat: number | null;
  lng: number | null;
  owner_id?: string;
  image_url?: string | null;
};

export default function HorseMap({
  horses,
  userLocation = null,
  highlightedId = null,
}: {
  horses: HorseMapHorse[];
  userLocation?: { lat: number; lng: number } | null;
  highlightedId?: string | null;
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

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap zoom={7} center={center} mapContainerStyle={{ width: '100%', height: '600px', borderRadius: 16 }}>
      {horses.map((horse) =>
        horse.lat && horse.lng ? (
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

      {selectedHorse && selectedHorse.lat && selectedHorse.lng ? (
        <InfoWindow
          position={{ lat: selectedHorse.lat, lng: selectedHorse.lng }}
          onCloseClick={() => setSelected(null)}
        >
          <div style={{ maxWidth: 220 }}>
            {selectedHorse.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedHorse.image_url}
                alt={selectedHorse.name ?? 'Horse'}
                style={{
                  width: '100%',
                  height: 110,
                  objectFit: 'cover',
                  borderRadius: 10,
                  marginBottom: 8,
                  border: '1px solid rgba(0,0,0,0.10)',
                }}
              />
            ) : null}

            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
              {selectedHorse.name ?? 'Horse'}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link
                href={`/horse?id=${selectedHorse.id}`}
                style={{
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 900,
                  border: '1px solid rgba(0,0,0,0.14)',
                  padding: '8px 10px',
                  borderRadius: 10,
                  color: 'black',
                  background: 'white',
                }}
              >
                View Horse
              </Link>

              <Link
                href={`/request?horseId=${selectedHorse.id}`}
                style={{
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 900,
                  border: '1px solid rgba(0,0,0,0.14)',
                  padding: '8px 10px',
                  borderRadius: 10,
                  color: 'white',
                  background: 'black',
                }}
              >
                Request →
              </Link>

              {selectedHorse.owner_id ? (
                <Link
                  href={`/owner/${selectedHorse.owner_id}`}
                  style={{
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 900,
                    padding: '8px 10px',
                    borderRadius: 10,
                    color: '#111',
                    background: 'rgba(0,0,0,0.06)',
                  }}
                >
                  Owner
                </Link>
              ) : null}
            </div>
          </div>
        </InfoWindow>
      ) : null}
    </GoogleMap>
  );
}
