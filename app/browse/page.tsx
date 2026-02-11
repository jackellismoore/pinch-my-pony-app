"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";

const MapContainer: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup: any = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

type Horse = {
  id: string;
  name: string;
  breed: string;
  image_url: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [userLocation, setUserLocation] = useState<any>(null);

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
    const { data, error } = await supabase
      .from("horses")
      .select("*");

    console.log("HORSES FROM DB:", data);

    if (!error && data) {
      setHorses(data as Horse[]);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: "40%", padding: 20, overflowY: "scroll" }}>
        <h2>All Horses</h2>

        {horses.map((horse) => (
          <div
            key={horse.id}
            style={{
              border: "1px solid #ddd",
              padding: 15,
              marginBottom: 15,
              borderRadius: 8,
            }}
          >
            <h3>{horse.name}</h3>
            <p>{horse.breed}</p>
            <p>📍 {horse.location_name || "No location set"}</p>
            <p>
              Lat: {horse.latitude || "None"} | Lng:{" "}
              {horse.longitude || "None"}
            </p>
          </div>
        ))}
      </div>

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

            {horses.map((horse) =>
              horse.latitude && horse.longitude ? (
                <Marker
                  key={horse.id}
                  position={[
                    Number(horse.latitude),
                    Number(horse.longitude),
                  ]}
                >
                  <Popup>
                    <strong>{horse.name}</strong>
                  </Popup>
                </Marker>
              ) : null
            )}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
