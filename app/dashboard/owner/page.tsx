"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  horse_id: string;
  borrower_id: string;
  horses: { name: string }[];
  profiles: { full_name: string | null }[];
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

    // 1️⃣ Get horses owned by user
    const { data: horses } = await supabase
      .from("horses")
      .select("id")
      .eq("owner_id", user.id);

    const horseIds = horses?.map((h) => h.id) || [];

    if (horseIds.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // 2️⃣ Get borrow requests for those horses
    const { data, error } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        horse_id,
        borrower_id,
        horses(name),
        profiles(full_name)
      `)
      .in("horse_id", horseIds)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as unknown as Request[]);
    }

    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status: newStatus })
      .eq("id", id);

    loadRequests();
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Owner Dashboard</h1>

      {loading && <p>Loading...</p>}

      {!loading && requests.length === 0 && (
        <p>No requests yet.</p>
      )}

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
          <h3>{req.horses?.[0]?.name || "Unknown Horse"}</h3>

          <p>
            <strong>
              {req.profiles?.[0]?.full_name || "Unknown User"}
            </strong>
          </p>

          <p>Status: {req.status}</p>

          {req.status === "pending" && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => updateStatus(req.id, "approved")}
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
                onClick={() => updateStatus(req.id, "declined")}
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
