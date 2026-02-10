"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Horse = {
  id: string;
  name: string;
  breed: string | null;
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHorses = async () => {
      const { data, error } = await supabase
        .from("horses")
        .select("id, name, breed")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading horses:", error.message);
      } else {
        setHorses(data || []);
      }

      setLoading(false);
    };

    loadHorses();
  }, []);

  if (loading) {
    return <p>Loading horses…</p>;
  }

  if (horses.length === 0) {
    return <p>No horses available yet.</p>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1>Browse Horses</h1>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {horses.map((horse) => (
          <li
            key={horse.id}
            style={{
              border: "1px solid #ccc",
              padding: 16,
              marginBottom: 12,
              borderRadius: 8,
            }}
          >
            <h2>{horse.name}</h2>
            {horse.breed && <p>Breed: {horse.breed}</p>}

            <Link href={`/request?horseId=${horse.id}`}>
              Request to borrow →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
