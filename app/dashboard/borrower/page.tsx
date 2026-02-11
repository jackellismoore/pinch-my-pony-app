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
        horses(name)
      `)
      .eq("borrower_id", user.id)
      .order("created_at", { ascending: false });

    setRequests((data as Request[]) || []);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>My Requests</h1>

      {requests.length === 0 && (
        <p>You have no requests yet.</p>
      )}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            marginBottom: 20,
            borderRadius: 8,
          }}
        >
          <h3>{req.horses?.[0]?.name}</h3>
          <p>{req.message}</p>

          <p
            style={{
              color:
                req.status === "approved"
                  ? "green"
                  : req.status === "rejected"
                  ? "red"
                  : "orange",
              fontWeight: 500,
            }}
          >
            {req.status.toUpperCase()}
          </p>
        </div>
      ))}
    </main>
  );
}
