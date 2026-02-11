"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import Link from "next/link";

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
    if (horses.length === 0) return;

    const bounds = horses
      .filter((h) => h.lat && h.lng)
      .map((h) => [h.lat, h.lng]) as [number, number][];

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
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
  return (
    <MapContainer
      center={
        userLocation
          ? [userLocation.lat, userLocation.lng]
          : [51.505, -0.09]
      }
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
          <Marker key={horse.id} position={[horse.lat, horse.lng]}>
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
