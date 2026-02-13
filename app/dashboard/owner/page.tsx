"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  horse_id: string;
  borrower_id: string;
  horses: { name: string }[] | null;
  profiles: { full_name: string }[] | null;
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
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        horse_id,
        borrower_id,
        horses!inner(name, owner_id),
        profiles!borrow_requests_borrower_id_fkey(full_name)
      `)
      .eq("horses.owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load requests error:", error.message);
      setLoading(false);
      return;
    }

    setRequests((data ?? []) as Request[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("borrow_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Update error:", error.message);
      return;
    }

    loadRequests();
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading requests...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Owner Dashboard</h1>

      {requests.length === 0 && <p>No requests yet.</p>}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 20,
            marginBottom: 20,
            background: "#fff",
          }}
        >
          <h3>{req.horses?.[0]?.name ?? "Unknown Horse"}</h3>

          <p>
            <strong>
              {req.profiles?.[0]?.full_name ?? "Unknown Borrower"}
            </strong>
          </p>

          <p>Status: {req.status}</p>

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
