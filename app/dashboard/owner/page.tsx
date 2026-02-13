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

    // 1️⃣ Get owner horses
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

    // 2️⃣ Get requests for those horses
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

    // 3️⃣ Attach horse name + borrower name manually (SAFE WAY)
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

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status: newStatus })
      .eq("id", id);

    // If approved → redirect to messages
    if (newStatus === "approved") {
      router.push("/messages");
    }

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
            <h3 style={{ marginBottom: 8 }}>{req.horse_name}</h3>

            <p style={{ marginBottom: 6 }}>
              <strong>Borrower:</strong> {req.borrower_name}
            </p>

            <p style={{ marginBottom: 6 }}>
              <strong>Status:</strong>{" "}
              <span
                style={{
                  color:
                    req.status === "approved"
                      ? "green"
                      : req.status === "declined"
                      ? "red"
                      : "orange",
                  fontWeight: 600,
                }}
              >
                {req.status}
              </span>
            </p>

            {req.start_date && (
              <p style={{ marginBottom: 6 }}>
                {req.start_date} → {req.end_date}
              </p>
            )}

            {req.status === "pending" && (
              <div style={{ marginTop: 15 }}>
                <button
                  onClick={() => updateStatus(req.id, "approved")}
                  style={{
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: 8,
                    marginRight: 10,
                    cursor: "pointer",
                  }}
                >
                  Approve
                </button>

                <button
                  onClick={() => updateStatus(req.id, "declined")}
                  style={{
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: 8,
                    cursor: "pointer",
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
