"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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

      if (!error && data) {
        setHorses(data);
      }

      setLoading(false);
    };

    loadHorses();
  }, []);

  if (loading) return <p>Loading horses…</p>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1>Browse Horses</h1>

      {horses.length === 0 && <p>No horses listed yet.</p>}

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
            <p>{horse.breed || "Unknown breed"}</p>

            <Link href={`/request?horseId=${horse.id}`}>
              Request to borrow →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
