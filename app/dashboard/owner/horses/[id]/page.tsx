"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function HorseDetailPage() {
  const params = useParams();
  const [horse, setHorse] = useState<any>(null);

  useEffect(() => {
    loadHorse();
  }, []);

  const loadHorse = async () => {
    const { data } = await supabase
      .from("horses")
      .select(`
        *,
        profiles (
          full_name,
          stable_name,
          age,
          bio,
          location
        )
      `)
      .eq("id", params.id)
      .single();

    setHorse(data);
  };

  if (!horse) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>{horse.name}</h1>

      {horse.image_url && (
        <img
          src={horse.image_url}
          style={{ width: 400, borderRadius: 8 }}
        />
      )}

      <p>{horse.age} yrs • {horse.height_hh}hh</p>
      <p>{horse.temperament}</p>
      <p>{horse.location}</p>

      <hr style={{ margin: "30px 0" }} />

      <h2>Owner</h2>
      <p><strong>{horse.profiles?.full_name}</strong></p>
      <p>{horse.profiles?.stable_name}</p>
      <p>{horse.profiles?.location}</p>
      <p>{horse.profiles?.bio}</p>

      <Link href={`/request?horseId=${horse.id}`}>
        <button
          style={{
            marginTop: 20,
            padding: "10px 16px",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 6,
          }}
        >
          Message Owner
        </button>
      </Link>
    </div>
  );
}
