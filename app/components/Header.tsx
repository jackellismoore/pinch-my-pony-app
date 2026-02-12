"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;

    if (!currentUser) return;

    setUser(currentUser);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (profile) {
      setRole(profile.role);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header
      style={{
        padding: "16px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #eee",
        background: "#ffffff",
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: 18 }}>
          🐴 Pinch My Pony
        </Link>

        {user && (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/browse">Browse</Link>
            <Link href="/messages">Messages</Link>

            {role === "owner" && (
              <>
                <Link href="/my-horses">My Horses</Link>
                <Link href="/horse">Add Horse</Link>
              </>
            )}
          </>
        )}
      </div>

      {/* Right */}
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {user ? (
          <>
            <NotificationBell />
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </header>
  );
}
