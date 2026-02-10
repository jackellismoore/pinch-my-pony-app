"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function HorsePage() {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreateHorse = async () => {
    setLoading(true);
    setMessage("");

    // 1. Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      setMessage("You must be logged in as an owner.");
      setLoading(false);
      return;
    }

    // 2. Fetch profile (THIS is the key fix)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profileError) {
      setMessage("Profile not found.");
      setLoading(false);
      return;
    }

    if (profile.role !== "owner") {
      setMessage("Only owners can list horses.");
      setLoading(false);
      return;
    }

    // 3. Insert horse linked to owner profile
    const { error: insertError } = await supabase.from("horses").insert({
      name,
      breed,
      owner_id: profile.id,
    });

    if (insertError) {
      setMessage(insertError.message);
    } else {
      setMessage("Horse listed successfully 🐎");
      setName("");
      setBreed("");
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
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

      <button onClick={handleCreateHorse} disabled={loading}>
        {loading ? "Saving..." : "Add Horse"}
      </button>

      {message && (
        <p style={{ marginTop: 16, color: message.includes("success") ? "green" : "red" }}>
          {message}
        </p>
      )}
    </div>
  );
}
