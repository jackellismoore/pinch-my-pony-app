"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Request = {
  id: string;
  horses: { name: string }[];
  profiles: { full_name: string }[];
};

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [requests, setRequests] = useState<Request[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel("realtime-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "borrow_requests",
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        horses(name, owner_id),
        profiles(full_name)
      `)
      .eq("status", "pending")
      .eq("seen", false)
      .eq("horses.owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    setCount(data?.length || 0);
    setRequests((data as Request[]) || []);
  };

  const markAllAsSeen = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("borrow_requests")
      .update({ seen: true })
      .eq("status", "pending")
      .eq("seen", false);

    loadNotifications();
  };

  const handleToggle = () => {
    setOpen(!open);
    if (!open) {
      markAllAsSeen();
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleToggle}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 20,
          position: "relative",
        }}
      >
        🔔

        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -8,
              background: "#dc2626",
              color: "white",
              fontSize: 12,
              padding: "2px 6px",
              borderRadius: "50%",
            }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 35,
            width: 260,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            padding: 10,
            zIndex: 100,
          }}
        >
          <h4 style={{ margin: "5px 10px" }}>
            New Requests
          </h4>

          {requests.length === 0 && (
            <p style={{ padding: 10, fontSize: 14 }}>
              No new requests
            </p>
          )}

          {requests.map((req) => (
            <Link
              key={req.id}
              href="/dashboard/owner"
              style={{
                display: "block",
                padding: 10,
                textDecoration: "none",
                color: "#111",
                borderRadius: 6,
              }}
            >
              <strong>
                {req.profiles?.[0]?.full_name ||
                  "Unknown User"}
              </strong>
              <br />
              <span style={{ fontSize: 13 }}>
                wants {req.horses?.[0]?.name}
              </span>
            </Link>
          ))}

          <Link
            href="/dashboard/owner"
            style={{
              display: "block",
              padding: 10,
              textAlign: "center",
              fontWeight: 500,
              textDecoration: "none",
              borderTop: "1px solid #eee",
              marginTop: 8,
            }}
          >
            View All
          </Link>
        </div>
      )}
    </div>
  );
}
