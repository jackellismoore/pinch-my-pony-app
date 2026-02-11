"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import dynamic from "next/dynamic";

const HorseMap = dynamic(
  () => import("../components/HorseMap"),
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
  distance?: number;
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [hoveredHorseId, setHoveredHorseId] = useState<string | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    loadHorses();
  }, [userLocation]);

  const getUserLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  };

  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => {
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const loadHorses = async () => {
    const { data } = await supabase.from("horses").select("*");

    let results = (data as Horse[]) || [];

    if (userLocation) {
      results = results.map((horse) => {
        if (horse.lat && horse.lng) {
          return {
            ...horse,
            distance: calculateDistance(
              userLocation.lat,
              userLocation.lng,
              horse.lat,
              horse.lng
            ),
          };
        }
        return horse;
      });

      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    setHorses(results);
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Browse Horses</h1>

      <div style={{ display: "flex", gap: 20 }}>
        {/* LIST */}
        <div style={{ width: "50%" }}>
          {horses.map((horse) => (
            <div
              key={horse.id}
              onMouseEnter={() => setHoveredHorseId(horse.id)}
              onMouseLeave={() => setHoveredHorseId(null)}
              style={{
                border: hoveredHorseId === horse.id
                  ? "2px solid #2563eb"
                  : "1px solid #ddd",
                padding: 15,
                marginBottom: 15,
                borderRadius: 10,
                background: "#fff",
                transition: "0.2s ease",
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
                  }}
                />
              )}

              <h3>{horse.name}</h3>

              {horse.distance && (
                <p style={{ color: "#2563eb", fontWeight: 500 }}>
                  {horse.distance.toFixed(1)} miles away
                </p>
              )}

              <p>{horse.age} yrs • {horse.height_hh}hh</p>
              <p>{horse.temperament}</p>
              <p>{horse.location}</p>

              <Link href={`/request?horseId=${horse.id}`}>
                <button style={{ marginTop: 8 }}>
                  Request
                </button>
              </Link>
            </div>
          ))}
        </div>

        {/* MAP */}
        <div style={{ width: "50%" }}>
          <HorseMap
            horses={horses}
            userLocation={userLocation}
            highlightedId={hoveredHorseId}
          />
        </div>
      </div>
    </div>
  );
}
