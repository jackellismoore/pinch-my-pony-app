"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Horse = {
  id: string;
  name: string;
  breed: string | null;
  description: string | null;
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);

  useEffect(() => {
    const loadHorses = async () => {
      const { data } = await supabase
        .from("horses")
        .select("id, name, breed, description")
        .order("created_at", { ascending: false });

      setHorses(data || []);
    };

    loadHorses();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Browse Horses</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 24,
          marginTop: 24,
        }}
      >
        {horses.map((horse) => (
          <div
            key={horse.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <img
              src="https://placehold.co/400x250?text=Horse"
              alt={horse.name}
              style={{ width: "100%", height: 180, objectFit: "cover" }}
            />

            <div style={{ padding: 16 }}>
              <h3>{horse.name}</h3>
              {horse.breed && <p>{horse.breed}</p>}

              <Link href={`/request?horseId=${horse.id}`}>
                Request to borrow →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
