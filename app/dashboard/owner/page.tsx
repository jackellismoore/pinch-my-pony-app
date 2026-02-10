"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Request = {
  id: string;
  message: string;
  status: string;
  horses: {
    name: string;
  }[];
};

export default function OwnerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("borrow_requests")
        .select(`
          id,
          message,
          status,
          horses ( name )
        `)
        .order("created_at", { ascending: false });

      if (!error) {
        setRequests((data as Request[]) || []);
      }

      setLoading(false);
    };

    loadRequests();
  }, []);

  if (loading) {
    return <p style={{ padding: 24 }}>Loading owner dashboard…</p>;
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto" }}>
      <h1>Owner Dashboard</h1>

      {requests.length === 0 && <p>No requests yet.</p>}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginBottom: 12,
            borderRadius: 6,
          }}
        >
          <strong>Horse:</strong>{" "}
          {req.horses?.[0]?.name || "Unknown"}

          <p>{req.message}</p>
          <p>Status: {req.status}</p>
        </div>
      ))}
    </main>
  );
}
