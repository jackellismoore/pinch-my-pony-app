"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnread();

    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          loadUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUnread = async () => {
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;

    if (!userId) return;

    const { data } = await supabase
      .from("messages")
      .select("id")
      .neq("sender_id", userId)
      .eq("read", false);

    setUnreadCount(data?.length || 0);
  };

  return (
    <Link href="/messages" style={{ position: "relative" }}>
      <span style={{ fontSize: 22 }}>🔔</span>

      {unreadCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: -5,
            right: -8,
            background: "red",
            color: "white",
            borderRadius: "50%",
            padding: "3px 7px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
