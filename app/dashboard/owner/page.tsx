"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  horse_id: string;
  borrower_id: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export default function OwnerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("borrow_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading requests:", error);
    } else {
      console.log("Loaded requests:", data);
      setRequests(data || []);
    }

    setLoading(false);
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading requests...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Owner Dashboard</h1>

      {requests.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        requests.map((req) => (
          <div
            key={req.id}
            style={{
              border: "1px solid #ddd",
              padding: 20,
              marginBottom: 20,
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <p><strong>Request ID:</strong> {req.id}</p>
            <p><strong>Horse ID:</strong> {req.horse_id}</p>
            <p><strong>Borrower ID:</strong> {req.borrower_id}</p>
            <p><strong>Status:</strong> {req.status}</p>
            <p><strong>Start:</strong> {req.start_date}</p>
            <p><strong>End:</strong> {req.end_date}</p>
          </div>
        ))
      )}
    </div>
  );
}
