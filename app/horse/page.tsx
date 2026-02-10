"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function HorsePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadOwner = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/signup");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "owner") {
        router.replace("/browse");
        return;
      }

      setOwnerId(profile.id);
    };

    loadOwner();
  }, [router]);

  const handleCreateHorse = async () => {
    if (!ownerId) return;

    let photoUrl = null;

    if (file) {
      const filePath = `${ownerId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("horse-photos")
        .upload(filePath, file);

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      const { data } = supabase.storage
        .from("horse-photos")
        .getPublicUrl(filePath);

      photoUrl = data.publicUrl;
    }

    const { error } = await supabase.from("horses").insert({
      name,
      breed,
      owner_id: ownerId,
      photo_url: photoUrl,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Horse added successfully 🐎");
      setName("");
      setBreed("");
      setFile(null);
    }
  };

  return (
    <main style={{ maxWidth: 500, margin: "40px auto" }}>
      <h1>Add a Horse</h1>

      <input
        placeholder="Horse name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%", marginBottom: 12 }}
      />

      <input
        placeholder="Breed"
        value={breed}
        onChange={(e) => setBreed(e.target.value)}
        style={{ width: "100%", marginBottom: 12 }}
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginBottom: 12 }}
      />

      <button onClick={handleCreateHorse}>Add Horse</button>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}
    </main>
  );
}
