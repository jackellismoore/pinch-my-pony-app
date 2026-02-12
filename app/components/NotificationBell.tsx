"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    loadUnread();

    const channel = supabase
      .channel("messages-unread")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => loadUnread()
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

    setUnread(data?.length || 0);
  };

  return (
    <Link href="/messages" style={{ position: "relative" }}>
      🔔
      {unread > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -10,
            background: "red",
            color: "white",
            borderRadius: "50%",
            padding: "2px 6px",
            fontSize: 12,
          }}
        >
          {unread}
        </span>
      )}
    </Link>
  );
}
