"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

    // STEP 1 — Get owner's horses
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

    // STEP 2 — Get requests for those horses
    const { data, error } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        start_date,
        end_date,
        horses(name),
        profiles!borrow_requests_borrower_id_fkey(full_name)
      `)
      .in("horse_id", horseIds)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as any);
    }

    setLoading(false);
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 30 }}>🐴 Owner Dashboard</h1>

      {requests.length === 0 && (
        <p style={{ color: "#666" }}>No requests yet.</p>
      )}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            padding: 24,
            marginBottom: 20,
            borderRadius: 14,
            background: "#fff",
            boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
          }}
        >
          <h2>{req.horses?.[0]?.name}</h2>

          <p>
            Requested by{" "}
            <strong>
              {req.profiles?.[0]?.full_name || "Unknown"}
            </strong>
          </p>

          <p>
            {req.start_date
              ? `${new Date(req.start_date).toLocaleDateString()}`
              : "No dates"}
          </p>

          <div
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              display: "inline-block",
              background:
                req.status === "approved"
                  ? "#16a34a"
                  : req.status === "declined"
                  ? "#dc2626"
                  : "#f59e0b",
              color: "white",
              fontSize: 14,
            }}
          >
            {req.status.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  );
}
