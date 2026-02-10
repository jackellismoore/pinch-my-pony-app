"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Request = {
  id: string;
  status: string;
  horses: {
    name: string;
  }[];
};

export default function BorrowerDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMyRequests = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Get borrower profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("borrow_requests")
        .select(`
          id,
          status,
          horses ( name )
        `)
        .eq("borrower_id", profile.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setRequests((data as Request[]) || []);
      }

      setLoading(false);
    };

    loadMyRequests();
  }, []);

  if (loading) {
    return <p style={{ padding: 24 }}>Loading your requests…</p>;
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto" }}>
      <h1>My Requests</h1>

      {requests.length === 0 && <p>No requests yet.</p>}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginBottom: 12,
            borderRadius: 6,
          }}
        >
          <strong>Horse:</strong>{" "}
          {req.horses?.[0]?.name || "Unknown"}

          <p>Status: {req.status}</p>
        </div>
      ))}
    </main>
  );
}
