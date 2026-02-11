"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  horses: { name: string }[];
};

export default function BorrowerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel("borrower-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "borrow_requests" },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRequests = async () => {
    const user = await supabase.auth.getUser();

    const { data } = await supabase
      .from("borrow_requests")
      .select(`id, status, horses(name)`)
      .eq("borrower_id", user.data.user?.id)
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
          }}
        >
          <p>
            Horse: <strong>{req.horses?.[0]?.name}</strong>
          </p>

          <p>
            Status:{" "}
            <strong
              style={{
                color:
                  req.status === "approved"
                    ? "green"
                    : req.status === "declined"
                    ? "red"
                    : "orange",
              }}
            >
              {req.status}
            </strong>
          </p>
        </div>
      ))}
    </div>
  );
}
