"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Request = {
  id: string;
  status: string;
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
        status,
        horses(name)
      `)
      .eq("borrower_id", user.id)
      .order("created_at", { ascending: false });

    setRequests((data as Request[]) || []);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>My Requests</h1>

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

          {/* OPEN CHAT BUTTON */}
          <div style={{ marginTop: 15 }}>
            <Link href={`/messages/${req.id}`}>
              <button
                style={{
                  padding: "8px 14px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                }}
              >
                Open Chat
              </button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
