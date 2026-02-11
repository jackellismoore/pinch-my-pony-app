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
};

export default function BrowsePage() {
  const [horses, setHorses] = useState<Horse[]>([]);

  useEffect(() => {
    loadHorses();
  }, []);

  const loadHorses = async () => {
    const { data } = await supabase
      .from("horses")
      .select("*")
      .order("created_at", { ascending: false });

    setHorses((data as Horse[]) || []);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Browse Horses</h1>

      {horses.length === 0 && <p>No horses listed yet.</p>}

      {horses.map((horse) => (
        <div
          key={horse.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            marginBottom: 20,
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <h2>{horse.name}</h2>

          <p><strong>Breed:</strong> {horse.breed}</p>
          <p><strong>Age:</strong> {horse.age} years</p>
          <p><strong>Height:</strong> {horse.height_hh}hh</p>
          <p><strong>Temperament:</strong> {horse.temperament}</p>
          <p><strong>Location:</strong> {horse.location}</p>

          {horse.description && (
            <p style={{ marginTop: 10 }}>{horse.description}</p>
          )}

          <Link href={`/request?horseId=${horse.id}`}>
            <button
              style={{
                marginTop: 10,
                padding: "8px 16px",
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
