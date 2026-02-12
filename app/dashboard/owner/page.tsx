"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Horse = {
  id: string;
  name: string;
  breed: string;
  age: number;
  height_hh: number;
  temperament: string;
  location: string;
  image_url: string;
  owner_id: string;
};

export default function OwnerHorsesPage() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHorses();
  }, []);

  const loadHorses = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("horses")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    setHorses((data as Horse[]) || []);
    setLoading(false);
  };

  const deleteHorse = async (id: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this horse?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("horses")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Delete failed: " + error.message);
    } else {
      loadHorses();
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>My Horses</h1>

      <Link href="/dashboard/owner/horses/add">
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
                width: "100%",
                height: 200,
                objectFit: "cover",
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
          )}

          <h3>{horse.name}</h3>
          <p>{horse.breed}</p>
          <p>{horse.age} yrs • {horse.height_hh}hh</p>
          <p>{horse.temperament}</p>
          <p>{horse.location}</p>

          <div style={{ marginTop: 10 }}>
            <Link href={`/dashboard/owner/horses/edit/${horse.id}`}>
              <button
                style={{
                  marginRight: 10,
                  padding: "6px 12px",
                  background: "#16a34a",
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
                padding: "6px 12px",
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
