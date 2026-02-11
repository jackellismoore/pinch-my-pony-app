"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";

// Dynamically load Leaflet components (prevents SSR build errors)
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
  image_url: string;
  location_name: string;
  latitude: number;
  longitude: number;
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedHorse, setSelectedHorse] = useState<string | null>(null);

  useEffect(() => {
    getUserLocation();
    loadHorses();
  }, []);

  const getUserLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  };

  const loadHorses = async () => {
    const { data } = await supabase
      .from("horses")
      .select(
        "id, name, breed, image_url, location_name, latitude, longitude"
      );

    if (data) {
      const valid = data.filter(
        (h) => h.latitude && h.longitude
      ) as Horse[];
      setHorses(valid);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* LEFT SIDE LIST */}
      <div
        style={{
          width: "40%",
          overflowY: "scroll",
          padding: 20,
          borderRight: "1px solid #ddd",
        }}
      >
        <h2>Horses Near You</h2>

        {horses.map((horse) => (
          <div
            key={horse.id}
            onClick={() => setSelectedHorse(horse.id)}
            style={{
              border:
                selectedHorse === horse.id
                  ? "2px solid #2563eb"
                  : "1px solid #ddd",
              borderRadius: 10,
              padding: 15,
              marginBottom: 15,
              cursor: "pointer",
            }}
          >
            <img
              src={horse.image_url}
              alt={horse.name}
              style={{
                width: "100%",
                height: 150,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
            <h3>{horse.name}</h3>
            <p>{horse.breed}</p>
            <p>📍 {horse.location_name}</p>
          </div>
        ))}
      </div>

      {/* RIGHT SIDE MAP */}
      <div style={{ width: "60%" }}>
        {typeof window !== "undefined" && (
          <MapContainer
            center={
              userLocation
                ? [userLocation.lat, userLocation.lng]
                : [51.505, -0.09]
            }
            zoom={10}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution="© OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>You are here</Popup>
              </Marker>
            )}

            {horses.map((horse) => (
              <Marker
                key={horse.id}
                position={[
                  Number(horse.latitude),
                  Number(horse.longitude),
                ]}
                eventHandlers={{
                  click: () => setSelectedHorse(horse.id),
                }}
              >
                <Popup>
                  <strong>{horse.name}</strong>
                  <br />
                  {horse.breed}
                  <br />
                  <a href={`/horse/${horse.id}`}>
                    View Horse
                  </a>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
