"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function RequestClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const horseId = searchParams.get("horseId");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!horseId) {
      router.push("/browse");
    }
  }, [horseId, router]);

  const handleSubmit = async () => {
    if (!horseId) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("borrow_requests").insert({
      horse_id: horseId,
      borrower_id: user.id,
      start_date: startDate || null,
      end_date: endDate || null,
      message: message || null,
      status: "pending",
    });

    if (!error) {
      setSubmitted(true);
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <h2 style={{ color: "#16a34a" }}>Request Sent ✔</h2>
        <p>Your request has been sent to the owner.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 60, maxWidth: 500, margin: "0 auto" }}>
      <h1>Request to Borrow</h1>

      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        style={inputStyle}
      />

      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        style={inputStyle}
      />

      <textarea
        placeholder="Message to owner..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ ...inputStyle, height: 100 }}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={buttonStyle}
      >
        {loading ? "Sending..." : "Send Request"}
      </button>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 15,
  borderRadius: 8,
  border: "1px solid #ddd",
};

const buttonStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 8,
  background: "#2563eb",
  color: "white",
  border: "none",
  cursor: "pointer",
};
