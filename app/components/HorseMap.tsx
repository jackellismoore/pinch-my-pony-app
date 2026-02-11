"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import { useEffect } from "react";
import Link from "next/link";
import type { LatLngExpression } from "leaflet";

type Horse = {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
};

function AutoCenter({ horses }: { horses: Horse[] }) {
  const map = useMap();

  useEffect(() => {
    const valid = horses.filter((h) => h.lat && h.lng);

    if (valid.length === 0) return;

    const bounds = valid.map(
      (h) => [h.lat, h.lng] as LatLngExpression
    );

    map.fitBounds(bounds as any, { padding: [50, 50] });
  }, [horses, map]);

  return null;
}

export default function HorseMap({
  horses,
  userLocation,
}: {
  horses: Horse[];
  userLocation: { lat: number; lng: number } | null;
}) {
  const center: LatLngExpression = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [51.505, -0.09];

  return (
    <MapContainer
      center={center}
      zoom={7}
      style={{ height: "600px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AutoCenter horses={horses} />

      {horses
        .filter((h) => h.lat && h.lng)
        .map((horse) => (
          <Marker
            key={horse.id}
            position={[horse.lat, horse.lng] as LatLngExpression}
          >
            <Popup>
              <strong>{horse.name}</strong>
              <br />
              {horse.location}
              <br />
              <Link href={`/request?horseId=${horse.id}`}>
                View
              </Link>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
