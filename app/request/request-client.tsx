"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function RequestClient() {
  const searchParams = useSearchParams();
  const horseId = searchParams.get("horseId");

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitRequest = async () => {
    setError(null);
    setSuccess(false);
    setLoading(true);

    // 1️⃣ Get logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    // 2️⃣ Fetch borrower profile (THIS fixes the FK error)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile || profileError) {
      setError("Borrower profile not found.");
      setLoading(false);
      return;
    }

    // 3️⃣ Insert borrow request using profile.id
    const { error: insertError } = await supabase
      .from("borrow_requests")
      .insert({
        horse_id: horseId,
        borrower_id: profile.id,
        message,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      setMessage("");
    }

    setLoading(false);
  };

  return (
    <main style={{ maxWidth: 600, margin: "40px auto" }}>
      <h1>Request to Borrow</h1>

      <textarea
        placeholder="Tell the owner why you'd like to borrow this horse"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ width: "100%", minHeight: 120, padding: 12 }}
      />

      <button onClick={submitRequest} disabled={loading} style={{ marginTop: 16 }}>
        {loading ? "Sending…" : "Send request"}
      </button>

      {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}
      {success && (
        <p style={{ color: "green", marginTop: 12 }}>
          Request sent successfully 🐎
        </p>
      )}
    </main>
  );
}
