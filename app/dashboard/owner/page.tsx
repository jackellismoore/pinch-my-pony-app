"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  horses: { name: string } | null;
};

export default function OwnerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Get horses owned by this user
    const { data: horses } = await supabase
      .from("horses")
      .select("id")
      .eq("owner_id", user.id);

    if (!horses || horses.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const horseIds = horses.map((h) => h.id);

    // Get requests with horse name
    const { data, error } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        start_date,
        end_date,
        created_at,
        horses(name)
      `)
      .in("horse_id", horseIds)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as any);
    }

    setLoading(false);
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
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
            <p><strong>Horse:</strong> {req.horses?.name || "Unknown"}</p>
            <p><strong>Status:</strong> {req.status}</p>
            <p><strong>Start:</strong> {req.start_date}</p>
            <p><strong>End:</strong> {req.end_date}</p>
          </div>
        ))
      )}
    </div>
  );
}
