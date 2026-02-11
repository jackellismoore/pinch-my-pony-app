"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  message: string;
  status: string;
  horses: {
    name: string;
  }[];
};

export default function BorrowerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      setLoading(false);
    };

    loadRequests();
  }, []);

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <main style={{ padding: 40 }}>
      <h1>My Requests</h1>

      {requests.length === 0 && (
        <p>You haven’t requested any horses yet.</p>
      )}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            marginBottom: 20,
            borderRadius: 10,
            background: "#fff",
          }}
        >
          <h3 style={{ marginBottom: 8 }}>
            {req.horses?.[0]?.name}
          </h3>

          <p style={{ marginBottom: 12 }}>
            <strong>Your message:</strong> {req.message}
          </p>

          <span
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 14,
              background:
                req.status === "approved"
                  ? "#e6f9ed"
                  : req.status === "rejected"
                  ? "#fdeaea"
                  : "#fff4e5",
              color:
                req.status === "approved"
                  ? "green"
                  : req.status === "rejected"
                  ? "red"
                  : "orange",
            }}
          >
            {req.status.toUpperCase()}
          </span>
        </div>
      ))}
    </main>
  );
}
