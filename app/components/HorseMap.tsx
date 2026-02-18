'use client';

import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type Horse = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  owner_id?: string;
  owner_label?: string;
  distance?: number;
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

  const selectedHorse = useMemo(() => horses.find((h) => h.id === selected) ?? null, [horses, selected]);

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap zoom={7} center={center} mapContainerStyle={{ width: '100%', height: '600px' }}>
      {horses.map((horse) =>
        typeof horse.lat === 'number' && typeof horse.lng === 'number' ? (
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

      {selectedHorse ? (
        <InfoWindow
          position={{ lat: selectedHorse.lat, lng: selectedHorse.lng }}
          onCloseClick={() => setSelected(null)}
        >
          <div style={{ minWidth: 240 }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>
              {selectedHorse.owner_label?.trim() ? selectedHorse.owner_label.trim() : 'Owner'}
            </div>

            <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(0,0,0,0.7)', fontWeight: 750 }}>
              {selectedHorse.name}
            </div>

            {typeof selectedHorse.distance === 'number' ? (
              <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>
                {selectedHorse.distance.toFixed(1)} miles away
              </div>
            ) : null}

            <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {selectedHorse.owner_id ? (
                <Link
                  href={`/owner/${selectedHorse.owner_id}`}
                  style={{
                    border: '1px solid rgba(0,0,0,0.14)',
                    padding: '8px 10px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: 'black',
                    fontWeight: 900,
                    fontSize: 12,
                  }}
                >
                  View Profile
                </Link>
              ) : null}

              <Link
                href={`/request?horseId=${selectedHorse.id}`}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  padding: '8px 10px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: 'white',
                  background: 'black',
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                Request to book
              </Link>
            </div>
          </div>
        </InfoWindow>
      ) : null}
    </GoogleMap>
  );
}
