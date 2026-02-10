"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function RequestClient() {
  const searchParams = useSearchParams();
  const horseId = searchParams.get("horse");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submitRequest = async () => {
    setError("");
    setSuccess(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError("Profile not found. Please log out and back in.");
      return;
    }

    const { error: insertError } = await supabase
      .from("borrow_requests")
      .insert({
        horse_id: horseId,
        borrower_id: profile.id,
        message,
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage("");
    setSuccess(true);
  };

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 32 }}>
      <h1>Request to borrow</h1>

      <textarea
        placeholder="Tell the owner why you'd like to borrow this horse"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ width: "100%", padding: 12, minHeight: 120 }}
      />

      <button onClick={submitRequest} style={{ marginTop: 16 }}>
        Send request
      </button>

      {error && <p style={{ color: "red", marginTop: 16 }}>{error}</p>}
      {success && (
        <p style={{ color: "green", marginTop: 16 }}>
          Request sent successfully!
        </p>
      )}
    </main>
  );
}
