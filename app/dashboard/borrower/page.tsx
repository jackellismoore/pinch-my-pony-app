"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  horses: { name: string };
};

export default function BorrowerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    const loadMyRequests = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from("borrow_requests")
        .select(`
          id,
          status,
          horses ( name )
        `)
        .eq("borrower_id", profile.id)
        .order("created_at", { ascending: false });

      setRequests(data || []);
    };

    loadMyRequests();
  }, []);

  return (
    <main style={{ maxWidth: 800, margin: "40px auto" }}>
      <h1>My Requests</h1>

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
          <strong>{req.horses?.name}</strong>
          <p>Status: {req.status}</p>
        </div>
      ))}
    </main>
  );
}
