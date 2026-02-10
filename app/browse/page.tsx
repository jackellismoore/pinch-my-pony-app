"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type Horse = {
  id: string;
  name: string;
  breed: string | null;
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHorses = async () => {
      const { data, error } = await supabase
        .from("horses")
        .select("id, name, breed");

      if (error) {
        setError(error.message);
      } else {
        setHorses(data || []);
      }
    };

    loadHorses();
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1>Browse Horses</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {horses.length === 0 && <p>No horses available yet.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {horses.map((horse) => (
          <li
            key={horse.id}
            style={{
              border: "1px solid #ddd",
              padding: 16,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <h3>{horse.name}</h3>
            <p>{horse.breed || "Breed not specified"}</p>

            <Link href={`/horse?id=${horse.id}`}>
              View horse →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
