"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RequestClient({ horseId }: { horseId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const sendRequest = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    // ✅ Only block if pending or approved
    const { data: existing } = await supabase
      .from("borrow_requests")
      .select("id,status")
      .eq("horse_id", horseId)
      .eq("borrower_id", user.id)
      .in("status", ["pending", "approved"]);

    if (existing && existing.length > 0) {
      alert("You already have an active request for this horse.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("borrow_requests").insert({
      horse_id: horseId,
      borrower_id: user.id,
      status: "pending",
    });

    if (error) {
      alert("Something went wrong.");
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div style={{ marginTop: 20, color: "green", fontWeight: 600 }}>
        Request Sent ✔
      </div>
    );
  }

  return (
    <button
      onClick={sendRequest}
      disabled={loading}
      style={{
        marginTop: 10,
        padding: "10px 16px",
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      {loading ? "Sending..." : "Request to Borrow"}
    </button>
  );
}
