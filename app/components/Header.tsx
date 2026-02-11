"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  message: string;
  horses: { name: string }[];
};

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUser(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "owner") {
      setIsOwner(true);
      loadNotifications(user.id);

      // Auto-refresh every 10 seconds
      setInterval(() => {
        loadNotifications(user.id);
      }, 10000);
    }
  };

  const loadNotifications = async (ownerId: string) => {
    const { data } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        message,
        horses!inner(name, owner_id)
      `)
      .eq("horses.owner_id", ownerId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setNotifications((data as Notification[]) || []);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header
      style={{
        padding: 20,
        borderBottom: "1px solid #ddd",
        display: "flex",
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      <div>
        <Link href="/">🐎 Pinch My Pony</Link>
      </div>

      <nav style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <Link href="/browse">Browse</Link>

        {user && (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/profile">Profile</Link>

            {isOwner && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setOpen(!open)}
                  style={{ position: "relative", fontSize: 18 }}
                >
                  🔔
                  {notifications.length > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        background: "red",
                        color: "white",
                        borderRadius: "50%",
                        padding: "2px 6px",
                        fontSize: 12,
                      }}
                    >
                      {notifications.length}
                    </span>
                  )}
                </button>

                {open && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 30,
                      width: 280,
                      background: "white",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: 10,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      zIndex: 100,
                    }}
                  >
                    <h4 style={{ marginBottom: 10 }}>
                      Pending Requests
                    </h4>

                    {notifications.length === 0 && (
                      <p>No new requests</p>
                    )}

                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          borderBottom: "1px solid #eee",
                          paddingBottom: 8,
                          marginBottom: 8,
                        }}
                      >
                        <strong>{n.horses?.[0]?.name}</strong>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#555",
                          }}
                        >
                          {n.message.slice(0, 40)}...
                        </p>
                      </div>
                    ))}

                    <Link href="/dashboard">
                      View all →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <button onClick={logout}>Logout</button>
          </>
        )}

        {!user && (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
          </>
        )}
      </nav>
    </header>
  );
}
