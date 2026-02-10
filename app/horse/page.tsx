"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function HorsePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null);

  useEffect(() => {
    const guardOwner = async () => {
      // 1) Get session
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/signup");
        return;
      }

      // 2) Load profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        router.replace("/");
        return;
      }

      // 3) Enforce owner-only
      if (profile.role !== "owner") {
        router.replace("/browse");
        return;
      }

      setOwnerProfileId(profile.id);
      setLoading(false);
    };

    guardOwner();
  }, [router]);

  const handleCreateHorse = async () => {
    if (!ownerProfileId) return;

    setMessage(null);

    const { error } = await supabase.from("horses").insert({
      name,
      breed,
      owner_id: ownerProfileId,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Horse added successfully 🐎");
      setName("");
      setBreed("");
    }
  };

  if (loading) {
    return <p style={{ padding: 24 }}>Checking permissions…</p>;
  }

  return (
    <main style={{ maxWidth: 500, margin: "40px auto" }}>
      <h1>Add a Horse</h1>

      <input
        type="text"
        placeholder="Horse name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
      />

      <input
        type="text"
        placeholder="Breed"
        value={breed}
        onChange={(e) => setBreed(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
      />

      <button onClick={handleCreateHorse}>Add Horse</button>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}
    </main>
  );
}
