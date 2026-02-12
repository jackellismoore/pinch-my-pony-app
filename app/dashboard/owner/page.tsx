"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function OwnerDashboard() {
  const [horseCount, setHorseCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Count horses
    const { count } = await supabase
      .from("horses")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id);

    // Count pending requests
    const { data: requests } = await supabase
      .from("borrow_requests")
      .select("id, horses!inner(owner_id)")
      .eq("horses.owner_id", user.id)
      .eq("status", "pending");

    setHorseCount(count || 0);
    setPendingRequests(requests?.length || 0);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Owner Dashboard</h1>

      <div style={{ display: "flex", gap: 20, marginTop: 30 }}>
        <div style={cardStyle}>
          <h2>{horseCount}</h2>
          <p>Total Horses</p>
        </div>

        <div style={cardStyle}>
          <h2>{pendingRequests}</h2>
          <p>Pending Requests</p>
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <Link href="/dashboard/owner/horses">
          <button style={buttonStyle}>Manage My Horses</button>
        </Link>

        <Link href="/messages" style={{ marginLeft: 15 }}>
          <button style={buttonStyle}>View Messages</button>
        </Link>
      </div>
    </div>
  );
}

const cardStyle = {
  padding: 30,
  border: "1px solid #eee",
  borderRadius: 12,
  background: "#fff",
  minWidth: 200,
  textAlign: "center" as const,
};

const buttonStyle = {
  padding: "10px 18px",
  borderRadius: 8,
  background: "#2563eb",
  color: "white",
  border: "none",
  cursor: "pointer",
};
