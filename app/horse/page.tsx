"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function HorsePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddHorse = async () => {
    setLoading(true);
    setMessage(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in to add a horse.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("horses").insert({
      owner_id: user.id,
      name,
      description,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Horse added successfully 🐴");
      setName("");
      setDescription("");
    }

    setLoading(false);
  };

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h1>Add a Horse</h1>

      <label>
        Horse name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: 8, marginTop: 4 }}
        />
      </label>

      <br />
      <br />

      <label>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 8, marginTop: 4 }}
        />
      </label>

      <br />
      <br />

      <button onClick={handleAddHorse} disabled={loading}>
        {loading ? "Saving..." : "Add horse"}
      </button>

      {message && (
        <p style={{ marginTop: 16, color: message.includes("success") ? "green" : "red" }}>
          {message}
        </p>
      )}
    </main>
  );
}
