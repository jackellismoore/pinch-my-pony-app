"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  horses: { name: string } | null;
  profiles: { full_name: string | null } | null;
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

    if (!user) return;

    // 🔥 THIS IS THE IMPORTANT QUERY
    const { data, error } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        start_date,
        end_date,
        horses:horse_id (
          name,
          owner_id
        ),
        profiles:borrower_id (
          full_name
        )
      `)
      .eq("horses.owner_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as unknown as Request[]);
    }

    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status: newStatus })
      .eq("id", id);

    loadRequests();
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Owner Dashboard</h1>

      {loading && <p>Loading...</p>}

      {!loading && requests.length === 0 && (
        <p>No requests for your horses yet.</p>
      )}

      {requests.map((req) => (
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
          <h3>{req.horses?.name}</h3>

          <p>
            <strong>
              {req.profiles?.full_name || "Unknown Borrower"}
            </strong>
          </p>

          <p>Status: {req.status}</p>

          <p>
            {req.start_date && req.end_date
              ? `${req.start_date} → ${req.end_date}`
              : "No dates selected"}
          </p>

          {req.status === "pending" && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => updateStatus(req.id, "approved")}
                style={{
                  marginRight: 10,
                  padding: "8px 14px",
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                }}
              >
                Approve
              </button>

              <button
                onClick={() => updateStatus(req.id, "declined")}
                style={{
                  padding: "8px 14px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                }}
              >
                Decline
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
