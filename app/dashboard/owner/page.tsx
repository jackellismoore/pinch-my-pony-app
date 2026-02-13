"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Request = {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  horse_id: string;
  borrower_id: string;
  horse_name?: string;
  borrower_name?: string;
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: horses } = await supabase
      .from("horses")
      .select("id, name")
      .eq("owner_id", user.id);

    if (!horses || horses.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const horseIds = horses.map((h) => h.id);

    const { data: requestsData } = await supabase
      .from("borrow_requests")
      .select("*")
      .in("horse_id", horseIds)
      .order("created_at", { ascending: false });

    if (!requestsData) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      requestsData.map(async (req) => {
        const horse = horses.find((h) => h.id === req.horse_id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", req.borrower_id)
          .single();

        return {
          ...req,
          horse_name: horse?.name || "Unknown Horse",
          borrower_name: profile?.full_name || "Unknown User",
        };
      })
    );

    setRequests(enriched);
    setLoading(false);
  };

  const approveRequest = async (req: Request) => {
    await supabase
      .from("borrow_requests")
      .update({ status: "approved" })
      .eq("id", req.id);

    // Create conversation
    const { data: conversation } = await supabase
      .from("conversations")
      .insert({ request_id: req.id })
      .select()
      .single();

    if (conversation) {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
        content: "Request approved. You can now chat here.",
      });
    }

    router.push("/messages");
  };

  const declineRequest = async (id: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status: "declined" })
      .eq("id", id);

    loadRequests();
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 30 }}>Owner Dashboard</h1>

      {requests.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        requests.map((req) => (
          <div
            key={req.id}
            style={{
              border: "1px solid #eee",
              padding: 24,
              marginBottom: 20,
              borderRadius: 12,
              background: "#ffffff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <h3>{req.horse_name}</h3>
            <p><strong>Borrower:</strong> {req.borrower_name}</p>

            <p>
              <strong>Status:</strong>{" "}
              <span
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
              </span>
            </p>

            {req.status === "pending" && (
              <div style={{ marginTop: 15 }}>
                <button
                  onClick={() => approveRequest(req)}
                  style={{
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: 8,
                    marginRight: 10,
                  }}
                >
                  Approve
                </button>

                <button
                  onClick={() => declineRequest(req.id)}
                  style={{
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: 8,
                  }}
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
