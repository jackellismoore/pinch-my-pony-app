"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    loadUserAndNotifications();
  }, []);

  const loadUserAndNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUser(user);

    // Get profile role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "owner") {
      // Count pending requests for owner's horses
      const { count } = await supabase
        .from("borrow_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      setPendingCount(count || 0);
    }
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
      }}
    >
      <div>
        <Link href="/">🐎 Pinch My Pony</Link>
      </div>

      <nav style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <Link href="/browse">Browse</Link>

        {user ? (
          <>
            <Link href="/dashboard">
              Dashboard{" "}
              {pendingCount > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    background: "red",
                    color: "white",
                    borderRadius: 20,
                    padding: "2px 8px",
                    fontSize: 12,
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </Link>

            <Link href="/profile">Profile</Link>

            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
          </>
        )}
      </nav>
    </header>
  );
}
