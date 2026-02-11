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
  const [filteredHorses, setFilteredHorses] = useState<Horse[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [radius, setRadius] = useState<number>(50);
  const [hoveredHorseId, setHoveredHorseId] = useState<string | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    loadHorses();
  }, [userLocation]);

  useEffect(() => {
    applyRadiusFilter();
  }, [horses, radius]);

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
    const R = 3958.8; // miles
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
    }

    setHorses(results);
  };

  const applyRadiusFilter = () => {
    if (!userLocation) {
      setFilteredHorses(horses);
      return;
    }

    const filtered = horses.filter((horse) => {
      if (!horse.distance) return false;
      return horse.distance <= radius;
    });

    setFilteredHorses(filtered);
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Browse Horses</h1>

      {/* Radius Filter */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ marginRight: 10 }}>Radius:</label>
        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
        >
          <option value={10}>10 miles</option>
          <option value={25}>25 miles</option>
          <option value={50}>50 miles</option>
          <option value={100}>100 miles</option>
          <option value={500}>500 miles</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* LIST */}
        <div style={{ width: "50%" }}>
          {filteredHorses.map((horse) => (
            <div
              key={horse.id}
              onMouseEnter={() => setHoveredHorseId(horse.id)}
              onMouseLeave={() => setHoveredHorseId(null)}
              style={{
                border:
                  hoveredHorseId === horse.id
                    ? "2px solid #2563eb"
                    : "1px solid #ddd",
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
                  }}
                />
              )}

              <h3>{horse.name}</h3>

              {horse.distance && (
                <p style={{ color: "#2563eb", fontWeight: 500 }}>
                  {horse.distance.toFixed(1)} miles away
                </p>
              )}

              <p>
                {horse.age} yrs • {horse.height_hh}hh
              </p>
              <p>{horse.temperament}</p>
              <p>{horse.location}</p>

              <Link href={`/request?horseId=${horse.id}`}>
                <button style={{ marginTop: 8 }}>Request</button>
              </Link>
            </div>
          ))}
        </div>

        {/* MAP */}
        <div style={{ width: "50%" }}>
          <HorseMap
            horses={filteredHorses}
            userLocation={userLocation}
            highlightedId={hoveredHorseId}
          />
        </div>
      </div>
    </div>
  );
}
