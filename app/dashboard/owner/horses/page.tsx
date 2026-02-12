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
  image_url: string | null;
  is_active: boolean;
};

export default function MyHorsesPage() {
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

    setHorses(data || []);
    setLoading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase
      .from("horses")
      .update({ is_active: !current })
      .eq("id", id);

    loadHorses();
  };

  const deleteHorse = async (id: string) => {
    const confirmDelete = confirm("Delete this horse?");
    if (!confirmDelete) return;

    await supabase.from("horses").delete().eq("id", id);

    loadHorses();
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>My Horses</h1>

      <Link href="/dashboard/owner/horses/add">
        <button style={addButton}>+ Add Horse</button>
      </Link>

      <div style={{ marginTop: 30 }}>
        {horses.length === 0 && <p>No horses yet.</p>}

        {horses.map((horse) => (
          <div key={horse.id} style={card}>
            {horse.image_url && (
              <img
                src={horse.image_url}
                style={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            )}

            <h3>{horse.name}</h3>
            <p>{horse.breed}</p>
            <p>{horse.age} yrs • {horse.height_hh}hh</p>
            <p>{horse.temperament}</p>
            <p>{horse.location}</p>

            <p>
              Status:{" "}
              <strong style={{ color: horse.is_active ? "green" : "red" }}>
                {horse.is_active ? "Active" : "Inactive"}
              </strong>
            </p>

            <div style={{ marginTop: 10 }}>
              <Link href={`/dashboard/owner/horses/edit/${horse.id}`}>
                <button style={editButton}>Edit</button>
              </Link>

              <button
                onClick={() => toggleActive(horse.id, horse.is_active)}
                style={toggleButton}
              >
                {horse.is_active ? "Deactivate" : "Activate"}
              </button>

              <button
                onClick={() => deleteHorse(horse.id)}
                style={deleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const addButton = {
  marginTop: 10,
  padding: "10px 18px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const editButton = {
  marginRight: 8,
  padding: "6px 12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 6,
};

const toggleButton = {
  marginRight: 8,
  padding: "6px 12px",
  background: "#f59e0b",
  color: "white",
  border: "none",
  borderRadius: 6,
};

const deleteButton = {
  padding: "6px 12px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 6,
};

const card = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 20,
  marginBottom: 20,
  background: "#fff",
};
