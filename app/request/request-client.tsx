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
    if (!horseId) {
      alert("Invalid horse.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert("You must be logged in.");
      setLoading(false);
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

    if (error) {
      console.error("Insert error:", error);
      alert("Request failed: " + error.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ color: "#16a34a" }}>Request Sent ✔</h2>
          <p>Your request has been sent to the owner.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginBottom: 20 }}>Request to Borrow</h1>

        <label style={labelStyle}>Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Message to Owner</label>
        <textarea
          placeholder="Introduce yourself..."
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
    </div>
  );
}

const containerStyle = {
  display: "flex",
  justifyContent: "center",
  padding: 60,
};

const cardStyle = {
  width: 500,
  background: "#fff",
  padding: 40,
  borderRadius: 12,
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
};

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 20,
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
  fontWeight: 600,
  cursor: "pointer",
};
