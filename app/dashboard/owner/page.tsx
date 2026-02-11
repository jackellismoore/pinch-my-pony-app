"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Horse = {
  id: string;
  name: string;
  breed: string | null;
};

type Request = {
  id: string;
  message: string;
  status: string;
  borrower_id: string;
  horses: {
    name: string;
  }[];
};

export default function OwnerDashboard() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Load owner's horses
    const { data: horsesData } = await supabase
      .from("horses")
      .select("id, name, breed")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    setHorses(horsesData || []);

    // Load requests for owner's horses
    const { data: requestsData } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        message,
        status,
        borrower_id,
        horses!inner(name, owner_id)
      `)
      .eq("horses.owner_id", user.id)
      .order("created_at", { ascending: false });

    setRequests((requestsData as Request[]) || []);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateStatus = async (
    id: string,
    status: "approved" | "rejected"
  ) => {
    await supabase
      .from("borrow_requests")
      .update({ status })
      .eq("id", id);

    loadData();
  };

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <main style={{ padding: 40 }}>
      <h1>Owner Dashboard</h1>

      {/* My Horses Section */}
      <h2 style={{ marginTop: 32 }}>My Horses</h2>

      {horses.length === 0 && <p>You have not added any horses yet.</p>}

      {horses.map((horse) => (
        <div
          key={horse.id}
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginBottom: 12,
            borderRadius: 8,
          }}
        >
          <h3>{horse.name}</h3>
          {horse.breed && <p>{horse.breed}</p>}
        </div>
      ))}

      {/* Requests Section */}
      <h2 style={{ marginTop: 40 }}>Borrow Requests</h2>

      {requests.length === 0 && <p>No requests yet.</p>}

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginBottom: 16,
            borderRadius: 8,
          }}
        >
          <h3>{req.horses?.[0]?.name}</h3>

          <p>
            <strong>Borrower:</strong> {req.borrower_id}
          </p>

          <p>
            <strong>Message:</strong> {req.message}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            <span
              style={{
                color:
                  req.status === "approved"
                    ? "green"
                    : req.status === "rejected"
                    ? "red"
                    : "orange",
              }}
            >
              {req.status}
            </span>
          </p>

          {req.status === "pending" && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => updateStatus(req.id, "approved")}
                style={{ marginRight: 8 }}
              >
                Approve
              </button>
              <button
                onClick={() => updateStatus(req.id, "rejected")}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
