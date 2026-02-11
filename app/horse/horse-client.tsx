"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function HorseClient() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [temperament, setTemperament] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const addHorse = async () => {
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) return;

    const { error } = await supabase.from("horses").insert({
      name,
      breed,
      age: Number(age),
      height_hh: Number(height),
      temperament,
      location,
      description,
      owner_id: user.id,
    });

    if (!error) {
      router.push("/dashboard/owner");
    } else {
      alert(error.message);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Add Horse</h1>

      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Breed" value={breed} onChange={(e) => setBreed(e.target.value)} />
      <input placeholder="Age (years)" value={age} onChange={(e) => setAge(e.target.value)} />
      <input placeholder="Height (hands)" value={height} onChange={(e) => setHeight(e.target.value)} />
      <input placeholder="Temperament" value={temperament} onChange={(e) => setTemperament(e.target.value)} />
      <input placeholder="Location (Town/County)" value={location} onChange={(e) => setLocation(e.target.value)} />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ display: "block", marginTop: 10, width: "100%", height: 100 }}
      />

      <button
        onClick={addHorse}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "#6b46c1",
          color: "white",
          border: "none",
          borderRadius: 6,
        }}
      >
        Save Horse
      </button>
    </div>
  );
}
