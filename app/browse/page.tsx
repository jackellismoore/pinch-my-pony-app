"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

// Leaflet dynamic imports (important for Next 16)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

type Horse = {
  id: string;
  name: string;
  breed: string;
  age: number;
  height_hh: number;
  temperament: string;
  location: string;
  description: string;
  image_url: string;
  lat: number;
  lng: number;
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [maxAge, setMaxAge] = useState("");

  useEffect(() => {
    loadHorses();
  }, []);

  const loadHorses = async () => {
    let query = supabase.from("horses").select("*");

    if (locationFilter) {
      query = query.ilike("location", `%${locationFilter}%`);
    }

    if (maxAge) {
      query = query.lte("age", Number(maxAge));
    }

    const { data } = await query;
    setHorses((data as Horse[]) || []);
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Browse Horses</h1>

      {/* FILTER BAR */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Location"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          style={{ padding: 8 }}
        />

        <input
          type="number"
          placeholder="Max Age"
          value={maxAge}
          onChange={(e) => setMaxAge(e.target.value)}
          style={{ padding: 8 }}
        />

        <button
          onClick={loadHorses}
          style={{
            padding: "8px 14px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
          }}
        >
          Apply
        </button>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* LEFT SIDE – HORSE LIST */}
        <div style={{ width: "50%" }}>
          {horses.length === 0 && <p>No horses found.</p>}

          {horses.map((horse) => (
            <div
              key={horse.id}
              style={{
                border: "1px solid #ddd",
                padding: 15,
                marginBottom: 15,
                borderRadius: 10,
                background: "#fff",
              }}
            >
              {horse.image_url && (
                <img
                  src={horse.image_url}
                  alt={horse.name}
                  style={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                />
              )}

              <h3>{horse.name}</h3>
              <p>{horse.age} yrs • {horse.height_hh}hh</p>
              <p>{horse.temperament}</p>
              <p>{horse.location}</p>

              <Link href={`/request?horseId=${horse.id}`}>
                <button
                  style={{
                    marginTop: 8,
                    padding: "6px 12px",
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                  }}
                >
                  Request
                </button>
              </Link>
            </div>
          ))}
        </div>

        {/* RIGHT SIDE – MAP */}
        <div style={{ width: "50%" }}>
          {typeof window !== "undefined" && (
            <MapContainer
              center={[51.505, -0.09]}
              zoom={7}
              style={{ height: "600px", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
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
          )}
        </div>
      </div>
    </div>
  );
}
