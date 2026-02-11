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
  const [maxDistance, setMaxDistance] = useState(50);

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
    const R = 6371;
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
      );

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
    }

    setHorses(enriched);
  };

  const filteredHorses = horses.filter(
    (horse) =>
      !horse.distance || horse.distance <= maxDistance
  );

  return (
    <div style={{ padding: 40 }}>
      <h1>Browse Horses</h1>

      {userLocation && (
        <div style={{ marginBottom: 20 }}>
          <label>
            Show within {maxDistance} km
          </label>
          <input
            type="range"
            min="5"
            max="200"
            value={maxDistance}
            onChange={(e) =>
              setMaxDistance(Number(e.target.value))
            }
          />
        </div>
      )}

      <div style={{ display: "grid", gap: 20 }}>
        {filteredHorses.map((horse) => (
          <div
            key={horse.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 20,
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
              }}
            />

            <h3>{horse.name}</h3>
            <p>{horse.breed}</p>
            <p>📍 {horse.location_name}</p>

            {horse.distance && (
              <p>📏 {horse.distance.toFixed(1)} km away</p>
            )}

            {horse.latitude && horse.longitude && (
              <iframe
                width="100%"
                height="200"
                style={{ borderRadius: 8 }}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${horse.longitude - 0.01}%2C${horse.latitude - 0.01}%2C${horse.longitude + 0.01}%2C${horse.latitude + 0.01}&layer=mapnik&marker=${horse.latitude}%2C${horse.longitude}`}
              />
            )}

            <div style={{ marginTop: 10 }}>
              <Link href={`/horse/${horse.id}`}>
                <button>View Horse</button>
              </Link>

              {horse.latitude && horse.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${horse.latitude},${horse.longitude}`}
                  target="_blank"
                >
                  <button style={{ marginLeft: 10 }}>
                    Get Directions
                  </button>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
