"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const GOOGLE_LIBRARIES: ("places")[] = ["places"];

export default function AddHorse() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [temperament, setTemperament] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    let imageUrl = "";

    // Upload image
    if (imageFile) {
      const fileName = `${Date.now()}-${imageFile.name}`;

      const { error } = await supabase.storage
        .from("horse-images")
        .upload(fileName, imageFile);

      if (!error) {
        const { data } = supabase.storage
          .from("horse-images")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }
    }

    // Insert horse
    await supabase.from("horses").insert({
      name,
      breed,
      age,
      height_hh: height,
      temperament,
      location,
      lat,
      lng,
      image_url: imageUrl,
      owner_id: user.id,
      active: true,
    });

    setLoading(false);
    router.push("/dashboard/owner/horses");
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Add Horse</h1>

      <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
      <input placeholder="Breed" onChange={(e) => setBreed(e.target.value)} />
      <input
        type="number"
        placeholder="Age"
        onChange={(e) => setAge(Number(e.target.value))}
      />
      <input
        type="number"
        placeholder="Height (hh)"
        onChange={(e) => setHeight(Number(e.target.value))}
      />
      <input
        placeholder="Temperament"
        onChange={(e) => setTemperament(e.target.value)}
      />
      <input
        placeholder="Location (City)"
        onChange={(e) => setLocation(e.target.value)}
      />

      <input
        type="file"
        onChange={(e) => {
          if (e.target.files) setImageFile(e.target.files[0]);
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "10px 16px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 6,
        }}
      >
        {loading ? "Saving..." : "Save Horse"}
      </button>
    </div>
  );
}
