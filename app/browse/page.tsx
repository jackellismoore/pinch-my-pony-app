"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type Horse = {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHorses = async () => {
      const { data, error } = await supabase
        .from("horses")
        .select("id, name, breed, photo_url")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setHorses(data || []);
      }

      setLoading(false);
    };

    loadHorses();
  }, []);

  if (loading) {
    return <p style={{ padding: 24 }}>Loading horses…</p>;
  }

  if (error) {
    return (
      <p style={{ padding: 24, color: "red" }}>
        Error loading horses: {error}
      </p>
    );
  }

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: "0 16px" }}>
      <h1>Browse Horses 🐎</h1>

      {horses.length === 0 && <p>No horses available yet.</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
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
            {horse.photo_url ? (
              <img
                src={horse.photo_url}
                alt={horse.name}
                style={{
                  width: "100%",
                  height: 200,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  height: 200,
                  background: "#f3f3f3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                }}
              >
                🐴
              </div>
            )}

            <div style={{ padding: 16 }}>
              <h3 style={{ marginBottom: 4 }}>{horse.name}</h3>
              <p style={{ marginTop: 0 }}>
                {horse.breed || "Breed not specified"}
              </p>

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
