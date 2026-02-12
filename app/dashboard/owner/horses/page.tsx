"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Horse = {
  id: string;
  name: string;
  image_url: string;
  price_per_day: number;
  is_active: boolean;
};

export default function OwnerHorsesPage() {
  const [horses, setHorses] = useState<Horse[]>([]);

  useEffect(() => {
    loadHorses();
  }, []);

  const loadHorses = async () => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    const { data } = await supabase
      .from("horses")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    setHorses((data as Horse[]) || []);
  };

  const toggleActive = async (horseId: string, current: boolean) => {
    await supabase
      .from("horses")
      .update({ is_active: !current })
      .eq("id", horseId);

    loadHorses();
  };

  return (
    <div style={{ padding: 40 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 30,
        }}
      >
        <h1>Manage My Horses</h1>

        <Link href="/dashboard/owner/horses/add">
          <button
            style={{
              padding: "8px 14px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
            }}
          >
            + Add Horse
          </button>
        </Link>
      </div>

      {horses.map((horse) => (
        <div
          key={horse.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            marginBottom: 20,
            borderRadius: 10,
            background: "#fff",
          }}
        >
          {horse.image_url && (
            <img
              src={horse.image_url}
              alt={horse.name}
              style={{
                width: "100%",
                maxHeight: 200,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          )}

          <h3>{horse.name}</h3>
          <p>£{horse.price_per_day} per day</p>

          <p>
            Status:{" "}
            <strong style={{ color: horse.is_active ? "green" : "red" }}>
              {horse.is_active ? "Active" : "Inactive"}
            </strong>
          </p>

          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => toggleActive(horse.id, horse.is_active)}
              style={{
                marginRight: 10,
                padding: "8px 14px",
                background: horse.is_active ? "#dc2626" : "#16a34a",
                color: "white",
                border: "none",
                borderRadius: 6,
              }}
            >
              {horse.is_active ? "Deactivate" : "Activate"}
            </button>

            <Link href={`/dashboard/owner/horses/${horse.id}`}>
              <button
                style={{
                  padding: "8px 14px",
                  background: "#111",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                }}
              >
                Edit
              </button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
