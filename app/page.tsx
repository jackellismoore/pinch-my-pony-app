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
  image_url: string;
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
      .eq("is_active", true);

    setHorses((data as Horse[]) || []);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Browse Horses</h1>

      {horses.length === 0 && <p>No horses available.</p>}

      {horses.map((horse) => (
        <div key={horse.id} style={cardStyle}>
          {horse.image_url && (
            <img
              src={horse.image_url}
              alt={horse.name}
              style={imageStyle}
            />
          )}

          <h3>{horse.name}</h3>
          <p>{horse.breed}</p>
          <p>{horse.age} yrs • {horse.height_hh}hh</p>
          <p>{horse.temperament}</p>
          <p>{horse.location}</p>

          <Link href={`/request?horseId=${horse.id}`}>
            <button style={primaryButton}>Request</button>
          </Link>
        </div>
      ))}
    </div>
  );
}

const cardStyle = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
  background: "#fff",
};

const imageStyle = {
  width: "100%",
  height: 200,
  objectFit: "cover" as const,
  borderRadius: 8,
  marginBottom: 10,
};

const primaryButton = {
  padding: "8px 14px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 6,
};
