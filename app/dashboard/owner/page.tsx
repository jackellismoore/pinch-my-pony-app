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
  horse_image?: string;
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

    if (!user) return;

    const { data: horses } = await supabase
      .from("horses")
      .select("id, name, image_url")
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
          horse_image: horse?.image_url || "",
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

  const pending = requests.filter(r => r.status === "pending").length;
  const approved = requests.filter(r => r.status === "approved").length;
  const declined = requests.filter(r => r.status === "declined").length;

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
    <div style={{ padding: "60px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* HEADER */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>
          🐴 Owner Dashboard
        </h1>
        <p style={{ color: "#6b7280" }}>
          Manage all incoming borrow requests
        </p>
      </div>

      {/* STATS BAR */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 50,
        }}
      >
        <StatCard label="Pending" value={pending} color="#f59e0b" />
        <StatCard label="Approved" value={approved} color="#16a34a" />
        <StatCard label="Declined" value={declined} color="#dc2626" />
      </div>

      {/* REQUEST CARDS */}
      {requests.length === 0 ? (
        <div
          style={{
            padding: 50,
            background: "#f9fafb",
            borderRadius: 16,
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
              display: "flex",
              gap: 25,
              padding: 30,
              marginBottom: 30,
              borderRadius: 20,
              background: "#ffffff",
              boxShadow: req.status === "pending"
                ? "0 15px 40px rgba(245,158,11,0.15)"
                : "0 10px 30px rgba(0,0,0,0.06)",
              border: "1px solid #f3f4f6",
              transition: "0.3s ease",
            }}
          >
            {/* IMAGE */}
            {req.horse_image && (
              <img
                src={req.horse_image}
                alt={req.horse_name}
                style={{
                  width: 140,
                  height: 140,
                  objectFit: "cover",
                  borderRadius: 16,
                }}
              />
            )}

            {/* CONTENT */}
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: 6 }}>{req.horse_name}</h2>

              <p style={{ color: "#6b7280", marginBottom: 10 }}>
                Requested by <strong>{req.borrower_name}</strong>
              </p>

              <span
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  ...statusStyles(req.status),
                }}
              >
                {req.status.toUpperCase()}
              </span>

              {req.start_date && (
                <div style={{ marginTop: 12, color: "#4b5563" }}>
                  📅 {req.start_date} → {req.end_date}
                </div>
              )}

              {req.status === "pending" && (
                <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                  <button
                    onClick={() => approveRequest(req)}
                    style={{
                      padding: "12px 22px",
                      borderRadius: 12,
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
                      padding: "12px 22px",
                      borderRadius: 12,
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
          </div>
        ))
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: 25,
        borderRadius: 16,
        background: "#ffffff",
        boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
        border: "1px solid #f3f4f6",
      }}
    >
      <div style={{ fontSize: 14, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
