"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  message: string | null;
  horses: {
    name: string;
    owner_id: string;
  }[];
  profiles: {
    full_name: string;
  }[];
};

export default function OwnerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        message,
        horses(name, owner_id),
        profiles(full_name)
      `)
      .eq("horses.owner_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setRequests(data || []);
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

  const getStatusColor = (status: string) => {
    if (status === "approved") return "#16a34a";
    if (status === "declined") return "#dc2626";
    return "#f59e0b"; // pending
  };

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 30 }}>Owner Dashboard</h1>

      {requests.length === 0 && <p>No requests yet.</p>}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid #e5e7eb",
            padding: 24,
            marginBottom: 20,
            borderRadius: 10,
            background: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <h3 style={{ marginBottom: 8 }}>
            {req.horses?.[0]?.name}
          </h3>

          <p style={{ marginBottom: 6 }}>
            <strong>
              {req.profiles?.[0]?.full_name || "Unknown User"}
            </strong>
          </p>

          {req.message && (
            <p style={{ marginBottom: 10, fontStyle: "italic" }}>
              "{req.message}"
            </p>
          )}

          <p
            style={{
              fontWeight: 600,
              color: getStatusColor(req.status),
              marginBottom: 12,
            }}
          >
            {req.status.toUpperCase()}
          </p>

          {req.status === "pending" && (
            <div>
              <button
                onClick={() => updateStatus(req.id, "approved")}
                style={{
                  marginRight: 10,
                  padding: "8px 14px",
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
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
                  cursor: "pointer",
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
