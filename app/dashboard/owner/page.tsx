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

    router.push("/messages");
  };

  const declineRequest = async (id: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status: "declined" })
      .eq("id", id);

    loadRequests();
  };

  const statusStyles = (status: string) => {
    if (status === "approved")
      return { background: "#dcfce7", color: "#15803d" };
    if (status === "declined")
      return { background: "#fee2e2", color: "#b91c1c" };
    return { background: "#fef9c3", color: "#92400e" };
  };

  if (loading)
    return <div style={{ padding: 60 }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: "60px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 50 }}>
        <h1 style={{ fontSize: 34, marginBottom: 10 }}>
          🐴 Owner Dashboard
        </h1>
        <p style={{ color: "#6b7280" }}>
          Manage incoming requests for your horses
        </p>
      </div>

      {requests.length === 0 ? (
        <div
          style={{
            padding: 40,
            background: "#f9fafb",
            borderRadius: 12,
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          No requests yet.
        </div>
      ) : (
        requests.map((req) => (
          <div
            key={req.id}
            style={{
              padding: 30,
              marginBottom: 30,
              borderRadius: 16,
              background: "#ffffff",
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              border: "1px solid #f3f4f6",
              transition: "0.2s ease",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ marginBottom: 6, fontSize: 22 }}>
                {req.horse_name}
              </h2>
              <p style={{ color: "#6b7280" }}>
                Requested by{" "}
                <strong style={{ color: "#111827" }}>
                  {req.borrower_name}
                </strong>
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <span
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  ...statusStyles(req.status),
                }}
              >
                {req.status.toUpperCase()}
              </span>
            </div>

            {req.start_date && (
              <div style={{ marginBottom: 20, color: "#4b5563" }}>
                📅 {req.start_date} → {req.end_date}
              </div>
            )}

            {req.status === "pending" && (
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => approveRequest(req)}
                  style={{
                    flex: 1,
                    padding: "12px 18px",
                    borderRadius: 10,
                    border: "none",
                    background: "#16a34a",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Approve
                </button>

                <button
                  onClick={() => declineRequest(req.id)}
                  style={{
                    flex: 1,
                    padding: "12px 18px",
                    borderRadius: 10,
                    border: "none",
                    background: "#ef4444",
                    color: "white",
                    fontWeight: 600,
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
