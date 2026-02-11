"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AddHorsePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [temperament, setTemperament] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    let imageUrl = "";

    if (imageFile) {
      const filePath = `${user.id}-${Date.now()}`;

      const { error: uploadError } = await supabase.storage
        .from("horse-images")
        .upload(filePath, imageFile);

      if (!uploadError) {
        const { data } = supabase.storage
          .from("horse-images")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }
    }

    await supabase.from("horses").insert({
      name,
      breed,
      age: Number(age),
      height_hh: Number(height),
      temperament,
      location,
      description,
      image_url: imageUrl,
      owner_id: user.id,
    });

    router.push("/dashboard/owner");
  };

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h1>Add Horse</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input placeholder="Name" required onChange={(e) => setName(e.target.value)} />
        <input placeholder="Breed" required onChange={(e) => setBreed(e.target.value)} />
        <input type="number" placeholder="Age" required onChange={(e) => setAge(e.target.value)} />
        <input type="number" step="0.1" placeholder="Height (hh)" required onChange={(e) => setHeight(e.target.value)} />
        <input placeholder="Temperament" required onChange={(e) => setTemperament(e.target.value)} />
        <input placeholder="Location" required onChange={(e) => setLocation(e.target.value)} />
        <textarea placeholder="Description" required onChange={(e) => setDescription(e.target.value)} />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />

        <button type="submit">Save Horse</button>
      </form>
    </div>
  );
}
