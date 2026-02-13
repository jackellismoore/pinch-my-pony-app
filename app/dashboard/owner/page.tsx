"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  horse_id: string;
  borrower_id: string;
  horses: { name: string }[];
  borrower: { full_name: string }[];
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

    // Get horses owned by logged in user
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

    // 🔥 Explicit FK usage here
    const { data, error } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        horse_id,
        borrower_id,
        horses(name),
        borrower:profiles!borrow_requests_borrower_id_fkey(full_name)
      `)
      .in("horse_id", horseIds)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as Request[]);
    }

    setLoading(false);
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
            background: "#fff",
          }}
        >
          <h3>{req.horses?.[0]?.name || "Horse"}</h3>

          <p>
            <strong>
              {req.borrower?.[0]?.full_name || "Borrower"}
            </strong>
          </p>

          <p>Status: {req.status}</p>
        </div>
      ))}
    </div>
  );
}
