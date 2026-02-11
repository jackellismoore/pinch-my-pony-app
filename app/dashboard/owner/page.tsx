"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  message: string;
  status: string;
  borrower_id: string;
  horses: { name: string }[];
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
        message,
        status,
        borrower_id,
        horses!inner(name, owner_id)
      `)
      .eq("horses.owner_id", user.id)
      .order("created_at", { ascending: false });

    setRequests((data as Request[]) || []);
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    await supabase
      .from("borrow_requests")
      .update({ status })
      .eq("id", id);

    loadRequests();
  };

  return (
    <main style={{ padding: 40 }}>
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

          <p><strong>Borrower:</strong> {req.borrower_id}</p>
          <p><strong>Message:</strong> {req.message}</p>

          <p>
            <strong>Status:</strong>{" "}
            <span
              style={{
                color:
                  req.status === "approved"
                    ? "green"
                    : req.status === "rejected"
                    ? "red"
                    : "orange",
              }}
            >
              {req.status}
            </span>
          </p>

          {req.status === "pending" && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => updateStatus(req.id, "approved")}
                style={{ marginRight: 10 }}
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
        </div>
      ))}
    </main>
  );
}
