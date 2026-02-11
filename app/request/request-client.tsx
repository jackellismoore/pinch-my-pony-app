"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function RequestClient({ horseId }: { horseId: string }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const sendRequest = async () => {
    setError("");
    setStatus("idle");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    const { error } = await supabase.from("borrow_requests").insert({
      horse_id: horseId,
      borrower_id: user.id,
      message,
      status: "pending",
    });

    if (error) {
      setError(error.message);
    } else {
      setStatus("success");
      setMessage("");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Request to borrow</h2>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tell the owner why you'd like to borrow this horse..."
        style={{
          width: "100%",
          height: 120,
          marginBottom: 20,
          padding: 10,
        }}
      />

      <button onClick={sendRequest}>Send request</button>

      {status === "success" && (
        <p style={{ color: "green", marginTop: 20 }}>
          ✅ Request sent successfully!
        </p>
      )}

      {error && (
        <p style={{ color: "red", marginTop: 20 }}>
          {error}
        </p>
      )}
    </div>
  );
}
