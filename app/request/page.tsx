"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";

export default function RequestPage() {
  const searchParams = useSearchParams();
  const horseId = searchParams.get("horseId");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const submitRequest = async () => {
    setStatus(null);

    if (!horseId) {
      setStatus("Horse not found.");
      return;
    }

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
      start_date: startDate,
      end_date: endDate,
      message,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Request sent successfully 🐎");
    setStartDate("");
    setEndDate("");
    setMessage("");
  };

  return (
    <main style={{ padding: 32, maxWidth: 500 }}>
      <h1>Request a Horse</h1>

      <label>Start date</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />

      <br />

      <label>End date</label>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />

      <br />

      <label>Message</label>
      <textarea
        placeholder="Tell the owner about your experience"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <br /><br />

      <button onClick={submitRequest}>
        Send request
      </button>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </main>
  );
}
