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

      {/* FILTERS */}
      <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
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

        {/* MAP */}
        <div style={{ width: "50%" }}>
          <HorseMap horses={horses} />
        </div>
      </div>
    </div>
  );
}
