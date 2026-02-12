"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Request = {
  id: string;
  status: string;
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
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) return;

    const { data, error } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        horses!inner(name, owner_id),
        profiles!borrow_requests_borrower_id_fkey(full_name)
      `)
      .eq("horses.owner_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as Request[]);
    }

    setLoading(false);
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Owner Dashboard</h1>

      {requests.length === 0 && (
        <p>No requests yet.</p>
      )}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid #e5e7eb",
            padding: 20,
            marginBottom: 20,
            borderRadius: 10,
            background: "#fff",
          }}
        >
          <h3>
            {req.horses?.[0]?.name || "Horse"}
          </h3>

          <p>
            Borrower:{" "}
            <strong>
              {req.profiles?.[0]?.full_name || "Unknown User"}
            </strong>
          </p>

          <p>
            Status:{" "}
            <strong
              style={{
                color:
                  req.status === "approved"
                    ? "#16a34a"
                    : req.status === "declined"
                    ? "#dc2626"
                    : "#d97706",
              }}
            >
              {req.status}
            </strong>
          </p>

          {/* LINK TO CONVERSATION */}
          <Link href={`/messages/${req.id}`}>
            <button
              style={{
                marginTop: 12,
                padding: "8px 14px",
                background: "#2563eb",
                color: "white",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
              }}
            >
              Open Conversation
            </button>
          </Link>
        </div>
      ))}
    </div>
  );
}
