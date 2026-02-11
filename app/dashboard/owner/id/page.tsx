"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import Link from "next/link";

type Horse = {
  id: string;
  name: string;
  image_url: string;
  price_per_day: number;
};

export default function OwnerProfilePage() {
  const { id } = useParams();
  const [owner, setOwner] = useState<any>(null);
  const [horses, setHorses] = useState<Horse[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: ownerData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    const { data: horseData } = await supabase
      .from("horses")
      .select("*")
      .eq("owner_id", id)
      .eq("is_active", true);

    setOwner(ownerData);
    setHorses((horseData as Horse[]) || []);
  };

  if (!owner) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40, maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          background: "#f9fafb",
          padding: 30,
          borderRadius: 12,
          marginBottom: 40,
        }}
      >
        <h1>{owner.full_name}</h1>

        {owner.location && (
          <p style={{ color: "#555" }}>{owner.location}</p>
        )}

        {owner.bio && (
          <p style={{ marginTop: 10 }}>{owner.bio}</p>
        )}
      </div>

      <h2 style={{ marginBottom: 20 }}>
        Available Horses
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: 20,
        }}
      >
        {horses.map((horse) => (
          <div
            key={horse.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 10,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            {horse.image_url && (
              <img
                src={horse.image_url}
                alt={horse.name}
                style={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                }}
              />
            )}

            <div style={{ padding: 15 }}>
              <h3>{horse.name}</h3>
              <p style={{ fontWeight: 600 }}>
                £{horse.price_per_day} per day
              </p>

              <Link href={`/request?horseId=${horse.id}`}>
                <button
                  style={{
                    marginTop: 10,
                    padding: "8px 14px",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                  }}
                >
                  Request
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
