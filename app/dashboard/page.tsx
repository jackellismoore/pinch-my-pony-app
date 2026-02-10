"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function DashboardPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

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

    const { data: borrowRequests } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        message,
        status,
        created_at,
        horses ( name )
      `)
      .in("horse_id", horseIds)
      .order("created_at", { ascending: false });

    setRequests(borrowRequests || []);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status })
      .eq("id", id);

    loadRequests();
  };

  if (loading) {
    return <p style={{ padding: 24 }}>Loading dashboard…</p>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1>Owner Dashboard</h1>

      <h2 style={{ marginTop: 32 }}>Borrow Requests</h2>

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

            <strong>Status:</strong>{" "}
            <span style={{ textTransform: "capitalize" }}>
              {req.status}
            </span>

            <p style={{ marginTop: 8 }}>
              <strong>Message:</strong><br />
              {req.message}
            </p>

            {req.status === "pending" && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => updateStatus(req.id, "approved")}
                  style={{ marginRight: 8 }}
                >
                  Approve
                </button>

                <button
                  onClick={() => updateStatus(req.id, "rejected")}
                >
                  Reject
                </button>
              </div>
            )}

            <small style={{ display: "block", marginTop: 8 }}>
              {new Date(req.created_at).toLocaleString()}
            </small>
          </li>
        ))}
      </ul>
    </main>
  );
}
