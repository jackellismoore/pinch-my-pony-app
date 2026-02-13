"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  horses: { name: string }[];
  profiles: { full_name: string }[];
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
      .select(`
        id,
        status,
        start_date,
        end_date,
        created_at,
        horses(name),
        profiles!borrow_requests_borrower_id_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as any);
    }

    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status })
      .eq("id", id);

    loadRequests();
  };

  const statusColor = (status: string) => {
    if (status === "approved") return "#16a34a";
    if (status === "declined") return "#dc2626";
    return "#f59e0b";
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading requests...</div>;
  }

  return (
    <div style={{ padding: 40, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 30 }}>
        🐴 Owner Dashboard
      </h1>

      {requests.length === 0 && (
        <p style={{ color: "#666" }}>No requests yet.</p>
      )}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            borderRadius: 14,
            padding: 24,
            marginBottom: 24,
            background: "#fff",
            boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
            border: "1px solid #eee",
          }}
        >
          {/* Horse + Borrower */}
          <div style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>
              {req.horses?.[0]?.name || "Unknown Horse"}
            </h2>
            <p style={{ margin: 0, color: "#555" }}>
              Requested by{" "}
              <strong>
                {req.profiles?.[0]?.full_name || "Unknown User"}
              </strong>
            </p>
          </div>

          {/* Dates */}
          <div style={{ marginBottom: 10 }}>
            {req.start_date && (
              <p style={{ margin: 0 }}>
                📅 {new Date(req.start_date).toLocaleDateString()} —{" "}
                {req.end_date
                  ? new Date(req.end_date).toLocaleDateString()
                  : "Same day"}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <div
            style={{
              display: "inline-block",
              padding: "6px 12px",
              borderRadius: 20,
              background: statusColor(req.status),
              color: "white",
              fontSize: 14,
              marginBottom: 15,
            }}
          >
            {req.status.toUpperCase()}
          </div>

          {/* Action Buttons */}
          {req.status === "pending" && (
            <div style={{ marginTop: 15 }}>
              <button
                onClick={() => updateStatus(req.id, "approved")}
                style={{
                  padding: "10px 18px",
                  marginRight: 10,
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Approve
              </button>

              <button
                onClick={() => updateStatus(req.id, "declined")}
                style={{
                  padding: "10px 18px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
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
