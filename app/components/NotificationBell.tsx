"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

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

  const loadNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("borrow_requests")
      .select("id, horses!inner(owner_id)")
      .eq("status", "pending")
      .eq("horses.owner_id", user.id);

    setCount(data?.length || 0);
  };

  return (
    <Link href="/dashboard/owner" style={{ position: "relative" }}>
      <span style={{ fontSize: 20 }}>🔔</span>

      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -10,
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
    </Link>
  );
}
