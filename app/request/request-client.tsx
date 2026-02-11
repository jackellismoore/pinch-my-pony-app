"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RequestClient({
  horseId,
}: {
  horseId: string;
}) {
  const [horse, setHorse] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const loadHorse = async () => {
      const { data } = await supabase
        .from("horses")
        .select("*")
        .eq("id", horseId)
        .single();

      setHorse(data);
    };

    loadHorse();
  }, [horseId]);

  const handleRequest = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !horse) return;

    const { error } = await supabase.from("borrow_requests").insert({
      horse_id: horse.id,
      borrower_id: user.id,
      message,
      status: "pending",
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Request sent!");
    }
  };

  if (!horse) return <p style={{ padding: 40 }}>Loading horse...</p>;

  return (
    <main style={{ padding: 40 }}>
      <h1>{horse.name}</h1>
      <p>{horse.breed}</p>

      <h2 style={{ marginTop: 30 }}>Request to borrow</h2>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        style={{ width: "100%", marginBottom: 20 }}
      />

      <button onClick={handleRequest}>Send request</button>

      {status && (
        <p style={{ marginTop: 20, color: "red" }}>
          {status}
        </p>
      )}
    </main>
  );
}
