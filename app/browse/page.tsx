"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Horse = {
  id: string;
  name: string;
  breed: string;
  image_url: string;
  location_name: string;
  latitude: number;
  longitude: number;
  distance?: number;
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      loadHorses(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setUserLocation({ lat, lng });
        loadHorses({ lat, lng });
      },
      () => {
        loadHorses(null);
      }
    );
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const loadHorses = async (
    location: { lat: number; lng: number } | null
  ) => {
    const { data } = await supabase
      .from("horses")
      .select(
        "id, name, breed, image_url, location_name, latitude, longitude"
      )
      .order("created_at", { ascending: false });

    if (!data) return;

    let enriched = data as Horse[];

    if (location) {
      enriched = enriched.map((horse) => {
        if (horse.latitude && horse.longitude) {
          const distance = calculateDistance(
            location.lat,
            location.lng,
            Number(horse.latitude),
            Number(horse.longitude)
          );

          return { ...horse, distance };
        }

        return horse;
      });

      enriched.sort((a, b) =>
        (a.distance || 9999) - (b.distance || 9999)
      );
    }

    setHorses(enriched);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 30 }}>Browse Horses</h1>

      {horses.length === 0 && <p>No horses available yet.</p>}

      <div style={{ display: "grid", gap: 20 }}>
        {horses.map((horse) => (
          <div
            key={horse.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 20,
              background: "#fff",
            }}
          >
            <img
              src={horse.image_url}
              alt={horse.name}
              style={{
                width: "100%",
                height: 200,
                objectFit: "cover",
                borderRadius: 8,
                marginBottom: 10,
              }}
            />

            <h3>{horse.name}</h3>
            <p>{horse.breed}</p>

            {horse.location_name && (
              <p>📍 {horse.location_name}</p>
            )}

            {horse.distance && (
              <p>
                📏 {horse.distance.toFixed(1)} km away
              </p>
            )}

            <Link href={`/horse/${horse.id}`}>
              <button
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                }}
              >
                View Horse
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
