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
  is_active: boolean;
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

    await supabase
      .from("horses")
      .delete()
      .eq("id", id);

    loadHorses();
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>My Horses</h1>

      <Link href="/dashboard/owner/horses/add">
        <button style={primaryButton}>Add Horse</button>
      </Link>

      {horses.length === 0 && <p>No horses yet.</p>}

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

          <p>
            Status:{" "}
            <strong style={{ color: horse.is_active ? "green" : "red" }}>
              {horse.is_active ? "Active" : "Inactive"}
            </strong>
          </p>

          <div style={{ marginTop: 12 }}>
            <Link href={`/dashboard/owner/horses/edit/${horse.id}`}>
              <button style={greenButton}>Edit</button>
            </Link>

            <button
              onClick={() => toggleActive(horse.id, horse.is_active)}
              style={yellowButton}
            >
              {horse.is_active ? "Deactivate" : "Activate"}
            </button>

            <button
              onClick={() => deleteHorse(horse.id)}
              style={redButton}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const primaryButton = {
  padding: "10px 16px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  marginBottom: 20,
};

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

const greenButton = {
  marginRight: 8,
  padding: "6px 12px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 6,
};

const yellowButton = {
  marginRight: 8,
  padding: "6px 12px",
  background: "#f59e0b",
  color: "white",
  border: "none",
  borderRadius: 6,
};

const redButton = {
  padding: "6px 12px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 6,
};
