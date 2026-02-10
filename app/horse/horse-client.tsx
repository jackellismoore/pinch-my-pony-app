"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function HorseClient() {
  const searchParams = useSearchParams();
  const horseId = searchParams.get("id");

  const [horse, setHorse] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!horseId) return;

    supabase
      .from("horses")
      .select("*")
      .eq("id", horseId)
      .single()
      .then(({ data }) => setHorse(data));
  }, [horseId]);

  const submitRequest = async () => {
    setStatus(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("You must be logged in to request a horse.");
      return;
    }

    const { error } = await supabase.from("borrow_requests").insert({
      horse_id: horseId,
      borrower_id: user.id,
      message,
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Request sent successfully 🐎");
      setMessage("");
    }
  };

  if (!horse) {
    return <p style={{ padding: 24 }}>Loading horse…</p>;
  }

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h1>{horse.name}</h1>
      <p>{horse.description}</p>

      <h3 style={{ marginTop: 32 }}>Request to borrow</h3>

      <textarea
        placeholder="Tell the owner about yourself"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: 8 }}
      />

      <br /><br />

      <button onClick={submitRequest}>
        Send request
      </button>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </main>
  );
}
