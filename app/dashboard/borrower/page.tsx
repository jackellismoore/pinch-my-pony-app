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
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRequests = async (pid: string) => {
    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        horses ( name )
      `)
      .eq("borrower_id", pid)
      .order("created_at", { ascending: false });

    setRequests((data as Request[]) || []);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      setProfileId(profile.id);
      await loadRequests(profile.id);
      setLoading(false);

      // 🔔 realtime subscription
      supabase
        .channel("borrower-requests")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "borrow_requests",
            filter: `borrower_id=eq.${profile.id}`,
          },
          () => {
            loadRequests(profile.id);
          }
        )
        .subscribe();
    };

    init();

    return () => {
      supabase.removeAllChannels();
    };
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
          <strong>{req.horses?.[0]?.name || "Unknown"}</strong>
          <p>Status: {req.status}</p>
        </div>
      ))}
    </main>
  );
}
