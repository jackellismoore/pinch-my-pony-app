"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [temperament, setTemperament] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const addHorse = async () => {
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You must be logged in.");
      return;
    }

    const { error } = await supabase.from("horses").insert({
      owner_id: user.id,
      name,
      location,
      temperament,
      description,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setName("");
    setLocation("");
    setTemperament("");
    setDescription("");
    setMessage("Horse added successfully 🐎");
  };

  return (
    <main style={{ padding: 32, maxWidth: 600 }}>
      <h1>Owner Dashboard</h1>

      <h2 style={{ marginTop: 24 }}>Add a horse</h2>

      <input
        placeholder="Horse name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br />

      <input
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <br />

      <input
        placeholder="Temperament"
        value={temperament}
        onChange={(e) => setTemperament(e.target.value)}
      />
      <br />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <br /><br />

      <button onClick={addHorse}>Add horse</button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}
