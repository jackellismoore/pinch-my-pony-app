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
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [radius, setRadius] = useState("");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    loadHorses();
    getUserLocation();
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
    let query = supabase.from("horses").select("*");

    if (locationFilter) {
      query = query.ilike("location", `%${locationFilter}%`);
    }

    if (maxAge) {
      query = query.lte("age", Number(maxAge));
    }

    const { data } = await query;

    let results = (data as Horse[]) || [];

    if (radius && userLocation) {
      results = results.filter((horse) => {
        if (!horse.lat || !horse.lng) return false;

        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          horse.lat,
          horse.lng
        );

        return distance <= Number(radius);
      });
    }

    setHorses(results);
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Browse Horses</h1>

      {/* FILTERS */}
      <div style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          placeholder="Location"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        />

        <input
          type="number"
          placeholder="Max Age"
          value={maxAge}
          onChange={(e) => setMaxAge(e.target.value)}
        />

        <input
          type="number"
          placeholder="Radius (miles)"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
        />

        <button onClick={loadHorses}>Apply</button>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* LIST */}
        <div style={{ width: "50%" }}>
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
                  }}
                />
              )}

              <h3>{horse.name}</h3>
              <p>{horse.age} yrs • {horse.height_hh}hh</p>
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
          <HorseMap horses={horses} userLocation={userLocation} />
        </div>
      </div>
    </div>
  );
}
