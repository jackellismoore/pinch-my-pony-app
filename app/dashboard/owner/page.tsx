"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function OwnerDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    debugLoad();
  }, []);

  const debugLoad = async () => {
    setLoading(true);

    // 1️⃣ Get logged in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("LOGGED IN USER ID:", user?.id);

    setUserId(user?.id ?? null);

    // 2️⃣ Fetch ALL borrow_requests (no filters)
    const { data, error } = await supabase
      .from("borrow_requests")
      .select("*");

    console.log("BORROW REQUESTS FROM DB:", data);
    console.log("ERROR:", error);

    setRequests(data ?? []);
    setLoading(false);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Owner Dashboard Debug</h1>

      {loading && <p>Loading...</p>}

      <div style={{ marginBottom: 20 }}>
        <strong>Logged in user ID:</strong>
        <div>{userId}</div>
      </div>

      <h2>Borrow Requests Raw Data:</h2>

      <pre
        style={{
          background: "#f4f4f4",
          padding: 20,
          borderRadius: 8,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(requests, null, 2)}
      </pre>
    </div>
  );
}
