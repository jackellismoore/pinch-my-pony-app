"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Request = {
  id: string;
  horse_id: string;
  borrower_id: string;
  status: string;
};

export default function OwnerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: horses } = await supabase
      .from("horses")
      .select("id")
      .eq("owner_id", user.id);

    if (!horses) return;

    const horseIds = horses.map((h) => h.id);

    const { data } = await supabase
      .from("borrow_requests")
      .select("*")
      .in("horse_id", horseIds)
      .order("created_at", { ascending: false });

    setRequests(data || []);
    setLoading(false);
  };

  const approveRequest = async (request: Request) => {
    // 1️⃣ Update status
    const { error: updateError } = await supabase
      .from("borrow_requests")
      .update({ status: "approved" })
      .eq("id", request.id);

    if (updateError) {
      console.error(updateError);
      return;
    }

    // 2️⃣ Create conversation linked to request
    const { error: insertError } = await supabase
      .from("conversations")
      .insert({
        request_id: request.id,
      });

    if (insertError) {
      console.error(insertError);
      return;
    }

    loadRequests();
    router.push("/messages");
  };

  const declineRequest = async (request: Request) => {
    await supabase
      .from("borrow_requests")
      .update({ status: "declined" })
      .eq("id", request.id);

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
                onClick={() => declineRequest(req)}
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
