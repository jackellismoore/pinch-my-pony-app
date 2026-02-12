"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type RequestStatus = "pending" | "approved" | "declined" | null;

export default function RequestClient({ horseId }: { horseId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RequestStatus>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    checkRequestStatus();
  }, []);

  const checkRequestStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Check if user owns the horse
    const { data: horse } = await supabase
      .from("horses")
      .select("owner_id")
      .eq("id", horseId)
      .single();

    if (horse?.owner_id === user.id) {
      setIsOwner(true);
      return;
    }

    // Check existing request
    const { data } = await supabase
      .from("borrow_requests")
      .select("status")
      .eq("horse_id", horseId)
      .eq("borrower_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setStatus(data[0].status);
    }
  };

  const sendRequest = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("borrow_requests").insert({
      horse_id: horseId,
      borrower_id: user.id,
      status: "pending",
    });

    if (!error) {
      setStatus("pending");
    }

    setLoading(false);
  };

  const cancelRequest = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("borrow_requests")
      .delete()
      .eq("horse_id", horseId)
      .eq("borrower_id", user.id)
      .eq("status", "pending");

    setStatus(null);
    setLoading(false);
  };

  if (isOwner) {
    return (
      <div style={{ marginTop: 20, fontWeight: 600 }}>
        This is your horse.
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div style={{ marginTop: 20, color: "green", fontWeight: 600 }}>
        ✔ Request Approved
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div style={{ marginTop: 20 }}>
        <div style={{ color: "#f59e0b", fontWeight: 600 }}>
          Request Pending
        </div>

        <button
          onClick={cancelRequest}
          disabled={loading}
          style={{
            marginTop: 10,
            padding: "8px 14px",
            background: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Cancel Request
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={sendRequest}
      disabled={loading}
      style={{
        marginTop: 10,
        padding: "10px 16px",
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      {loading ? "Sending..." : "Request to Borrow"}
    </button>
  );
}
