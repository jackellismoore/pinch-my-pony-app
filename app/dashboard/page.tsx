"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function DashboardPage() {
  const [requests, setRequests] = useState<any[]>([]);
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

      // Get horses owned by this user
      const { data: horses } = await supabase
        .from("horses")
        .select("id, name")
        .eq("owner_id", user.id);

      if (!horses || horses.length === 0) {
        setLoading(false);
        return;
      }

      const horseIds = horses.map((h) => h.id);

      // Get requests for those horses
      const { data: borrowRequests } = await supabase
        .from("borrow_requests")
        .select(`
          id,
          message,
          created_at,
          horses ( name )
        `)
        .in("horse_id", horseIds)
        .order("created_at", { ascending: false });

      setRequests(borrowRequests || []);
      setLoading(false);
    };

    loadRequests();
  }, []);

  if (loading) {
    return <p style={{ padding: 24 }}>Loading dashboard…</p>;
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1>Dashboard</h1>

      <h2 style={{ marginTop: 32 }}>Borrow requests</h2>

      {requests.length === 0 && <p>No requests yet.</p>}

      <ul style={{ marginTop: 16 }}>
        {requests.map((req) => (
          <li
            key={req.id}
            style={{
              border: "1px solid #eee",
              padding: 16,
              marginBottom: 16,
              borderRadius: 6,
            }}
          >
            <strong>Horse:</strong> {req.horses?.name}
            <br />
            <strong>Message:</strong>
            <p>{req.message}</p>
            <small>
              {new Date(req.created_at).toLocaleString()}
            </small>
          </li>
        ))}
      </ul>
    </main>
  );
}
