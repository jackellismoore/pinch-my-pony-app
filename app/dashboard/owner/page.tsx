"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  horse_id: string;
  borrower_id: string;
  horses: { name: string; owner_id: string }[];
};

export default function OwnerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        horse_id,
        borrower_id,
        horses(name, owner_id)
      `)
      .order("created_at", { ascending: false });

    const filtered =
      (data as Request[])?.filter(
        (r) => r.horses?.[0]?.owner_id === user.id
      ) || [];

    setRequests(filtered);
  };

  const approveRequest = async (request: Request) => {
    await supabase
      .from("borrow_requests")
      .update({ status: "approved" })
      .eq("id", request.id);

    await supabase.from("conversations").insert({
      request_id: request.id,
    });

    loadRequests();
  };

  const declineRequest = async (id: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status: "declined" })
      .eq("id", id);

    loadRequests();
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Owner Dashboard</h1>

      {requests.length === 0 && <p>No requests yet.</p>}

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
          <h3>{req.horses?.[0]?.name}</h3>
          <p>Status: {req.status}</p>

          {req.status === "pending" && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => approveRequest(req)}
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
                onClick={() => declineRequest(req.id)}
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
