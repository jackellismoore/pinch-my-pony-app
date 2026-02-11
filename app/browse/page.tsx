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
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);

  useEffect(() => {
    loadHorses();
  }, []);

  const loadHorses = async () => {
    const { data } = await supabase
      .from("horses")
      .select("id, name, breed, image_url, location_name")
      .order("created_at", { ascending: false });

    setHorses(data || []);
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
