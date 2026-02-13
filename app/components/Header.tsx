"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUnread();
      subscribeUnread();
    }
  }, [user]);

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const fetchUnread = async () => {
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("read", false)
      .neq("sender_id", user.id);

    setUnread(count || 0);
  };

  const subscribeUnread = () => {
    supabase
      .channel("unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchUnread()
      )
      .subscribe();
  };

  return (
    <header
      style={{
        padding: "20px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #eee",
        background: "white",
      }}
    >
      <Link href="/" style={{ fontWeight: 700, fontSize: 20 }}>
        🐴 Pinch My Pony
      </Link>

      {user && (
        <div style={{ display: "flex", gap: 25 }}>
          <Link href="/browse">Browse</Link>
          <Link href="/dashboard/owner">Dashboard</Link>

          <Link href="/messages" style={{ position: "relative" }}>
            Messages
            {unread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -8,
                  right: -14,
                  background: "#ef4444",
                  color: "white",
                  borderRadius: 50,
                  padding: "2px 7px",
                  fontSize: 11,
                }}
              >
                {unread}
              </span>
            )}
          </Link>
        </div>
      )}
    </header>
  );
}
