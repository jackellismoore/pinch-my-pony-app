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
  active: boolean;
};

export default function OwnerHorsesPage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHorses();
  }, []);

  const loadHorses = async () => {
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;

    if (!userId) return;

    const { data } = await supabase
      .from("horses")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    setHorses((data as Horse[]) || []);
    setLoading(false);
  };

  const toggleActive = async (horseId: string, current: boolean) => {
    await supabase
      .from("horses")
      .update({ active: !current })
      .eq("id", horseId);

    loadHorses();
  };

  const deleteHorse = async (horseId: string) => {
    const confirmDelete = confirm("Delete this horse?");
    if (!confirmDelete) return;

    await supabase
      .from("horses")
      .delete()
      .eq("id", horseId);

    loadHorses();
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>My Horses</h1>

      <Link href="/horse">
        <button
          style={{
            marginBottom: 20,
            padding: "8px 14px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
          }}
        >
          Add Horse
        </button>
      </Link>

      {horses.length === 0 && <p>No horses yet.</p>}

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
          {horse.image_url && (
            <img
              src={horse.image_url}
              alt={horse.name}
              style={{
                width: 250,
                height: 160,
                objectFit: "cover",
                borderRadius: 6,
                marginBottom: 10,
              }}
            />
          )}

          <h3>{horse.name}</h3>
          <p>{horse.breed}</p>
          <p>{horse.age} yrs • {horse.height_hh}hh</p>
          <p>{horse.temperament}</p>
          <p>{horse.location}</p>

          <p style={{ fontWeight: 600 }}>
            Status:{" "}
            <span style={{ color: horse.active ? "green" : "red" }}>
              {horse.active ? "Active" : "Inactive"}
            </span>
          </p>

          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => toggleActive(horse.id, horse.active)}
              style={{
                marginRight: 10,
                padding: "6px 10px",
                background: "#facc15",
                border: "none",
                borderRadius: 6,
              }}
            >
              Toggle Active
            </button>

            <Link href={`/horse/edit/${horse.id}`}>
              <button
                style={{
                  marginRight: 10,
                  padding: "6px 10px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                }}
              >
                Edit
              </button>
            </Link>

            <button
              onClick={() => deleteHorse(horse.id)}
              style={{
                padding: "6px 10px",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 6,
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
