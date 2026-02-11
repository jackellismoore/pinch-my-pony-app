"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

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

    const { data, error } = await query;

    if (!error && data) {
      setHorses(data as Horse[]);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Browse Horses</h1>

      {/* FILTER SECTION */}
      <div
        style={{
          marginBottom: 30,
          padding: 20,
          background: "#f8fafc",
          borderRadius: 10,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Filter by location"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          style={{ padding: 8 }}
        />

        <input
          type="number"
          placeholder="Max age"
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
          Apply Filters
        </button>
      </div>

      {/* HORSE LIST */}
      {horses.length === 0 && <p>No horses found.</p>}

      {horses.map((horse) => (
        <div
          key={horse.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            marginBottom: 20,
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
                maxHeight: 300,
                objectFit: "cover",
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
          )}

          <h2>{horse.name}</h2>

          <p><strong>Breed:</strong> {horse.breed}</p>
          <p><strong>Age:</strong> {horse.age}</p>
          <p><strong>Height:</strong> {horse.height_hh}hh</p>
          <p><strong>Temperament:</strong> {horse.temperament}</p>
          <p><strong>Location:</strong> {horse.location}</p>
          <p>{horse.description}</p>

          <Link href={`/request?horseId=${horse.id}`}>
            <button
              style={{
                marginTop: 10,
                padding: "8px 14px",
                background: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: 6,
              }}
            >
              Request to Borrow
            </button>
          </Link>
        </div>
      ))}
    </div>
  );
}
