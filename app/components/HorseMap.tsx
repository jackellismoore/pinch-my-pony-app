"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Link from "next/link";

type Horse = {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
};

export default function HorseMap({ horses }: { horses: Horse[] }) {
  return (
    <MapContainer
      center={[51.505, -0.09]}
      zoom={7}
      style={{ height: "600px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {horses
        .filter((h) => h.lat && h.lng)
        .map((horse) => (
          <Marker
            key={horse.id}
            position={[horse.lat, horse.lng]}
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
