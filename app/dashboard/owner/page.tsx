"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Request = {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  horses: { name: string }[];
  profiles: { full_name: string }[];
};

export default function OwnerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        start_date,
        end_date,
        horses(name),
        profiles!borrow_requests_borrower_id_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    setRequests((data as any) || []);
    setLoading(false);
  };

  const approveRequest = async (requestId: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status: "approved" })
      .eq("id", requestId);

    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("request_id", requestId)
      .single();

    if (!existing) {
      const { data: conversation } = await supabase
        .from("conversations")
        .insert({ request_id: requestId })
        .select()
        .single();

      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
        content: "Request approved. You can now chat here.",
      });
    }

    router.push("/messages");
  };

  const declineRequest = async (requestId: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status: "declined" })
      .eq("id", requestId);

    loadRequests();
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 30 }}>🐴 Owner Dashboard</h1>

      {requests.length === 0 && <p>No requests yet.</p>}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            padding: 24,
            borderRadius: 14,
            background: "#fff",
            marginBottom: 20,
            boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
          }}
        >
          <h2>{req.horses?.[0]?.name}</h2>
          <p>
            Requested by{" "}
            <strong>
              {req.profiles?.[0]?.full_name || "Unknown User"}
            </strong>
          </p>

          <div
            style={{
              padding: "6px 12px",
              display: "inline-block",
              borderRadius: 20,
              background:
                req.status === "approved"
                  ? "#16a34a"
                  : req.status === "declined"
                  ? "#dc2626"
                  : "#f59e0b",
              color: "white",
              fontSize: 14,
              marginBottom: 15,
            }}
          >
            {req.status.toUpperCase()}
          </div>

          {req.status === "pending" && (
            <div>
              <button
                onClick={() => approveRequest(req.id)}
                style={{
                  padding: "10px 18px",
                  marginRight: 10,
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Approve
              </button>

              <button
                onClick={() => declineRequest(req.id)}
                style={{
                  padding: "10px 18px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
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
