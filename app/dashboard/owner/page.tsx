"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  horse_id: string;
  borrower_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
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

    const { data: horses } = await supabase
      .from("horses")
      .select("id")
      .eq("owner_id", user.id);

    if (!horses || horses.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const horseIds = horses.map((h) => h.id);

    const { data } = await supabase
      .from("borrow_requests")
      .select("*")
      .in("horse_id", horseIds)
      .order("created_at", { ascending: false });

    setRequests(data || []);
    setLoading(false);
  };

  const updateStatus = async (request: Request, newStatus: string) => {
    // 1️⃣ Update status
    const { error } = await supabase
      .from("borrow_requests")
      .update({ status: newStatus })
      .eq("id", request.id);

    if (error) return;

    // 2️⃣ If approved → create conversation
    if (newStatus === "approved") {
      await supabase.from("conversations").insert({
        borrow_request_id: request.id,
        horse_id: request.horse_id,
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        borrower_id: request.borrower_id,
      });
    }

    loadRequests();
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

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
          }}
        >
          <p><strong>Status:</strong> {req.status}</p>
          <p>Horse ID: {req.horse_id}</p>
          <p>Borrower ID: {req.borrower_id}</p>

          {req.status === "pending" && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => updateStatus(req, "approved")}
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
                onClick={() => updateStatus(req, "declined")}
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
