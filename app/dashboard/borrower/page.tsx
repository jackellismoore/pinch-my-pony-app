"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  message: string;
  horses: { name: string }[];
};

export default function BorrowerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const user = await supabase.auth.getUser();

    const { data } = await supabase
      .from("borrow_requests")
      .select(`id, status, message, horses(name)`)
      .eq("borrower_id", user.data.user?.id)
      .order("created_at", { ascending: false });

    setRequests((data as Request[]) || []);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>My Requests</h1>

      {requests.length === 0 && (
        <p>You haven't made any requests yet.</p>
      )}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            background: "#ffffff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ marginBottom: 6 }}>
            {req.horses?.[0]?.name}
          </h3>

          <p style={{ fontSize: 14, marginBottom: 10 }}>
            {req.message}
          </p>

          <span
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              background:
                req.status === "approved"
                  ? "#dcfce7"
                  : req.status === "declined"
                  ? "#fee2e2"
                  : "#fef9c3",
              color:
                req.status === "approved"
                  ? "#166534"
                  : req.status === "declined"
                  ? "#991b1b"
                  : "#92400e",
            }}
          >
            {req.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
