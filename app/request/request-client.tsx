"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function RequestClient({ horseId }: { horseId: string }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  useEffect(() => {
    checkExistingRequest();
  }, []);

  const checkExistingRequest = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("borrow_requests")
      .select("id")
      .eq("horse_id", horseId)
      .eq("borrower_id", user.id)
      .eq("status", "pending");

    if (data && data.length > 0) {
      setAlreadyRequested(true);
    }
  };

  const handleSubmit = async () => {
    setStatus(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("You must be logged in.");
      return;
    }

    const { error } = await supabase.from("borrow_requests").insert({
      horse_id: horseId,
      borrower_id: user.id,
      message,
      status: "pending",
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Request sent!");
      setMessage("");
      setAlreadyRequested(true);
    }
  };

  if (alreadyRequested) {
    return (
      <p style={{ marginTop: 20, color: "orange" }}>
        You already have a pending request for this horse.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Request to borrow</h3>

      <textarea
        placeholder="Write your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <button onClick={handleSubmit}>Send request</button>

      {status && (
        <p
          style={{
            marginTop: 15,
            color: status === "Request sent!" ? "green" : "red",
            fontWeight: 500,
          }}
        >
          {status}
        </p>
      )}
    </div>
  );
}
