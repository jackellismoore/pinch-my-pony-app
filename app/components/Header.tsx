"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      style={{
        padding: "15px 40px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        background: "#fff",
      }}
    >
      <Link href="/">
        <h2>🐎 Pinch My Pony</h2>
      </Link>

      <div style={{ display: "flex", gap: 20 }}>
        {!user && (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
          </>
        )}

        {user && (
          <>
            <Link href="/browse">Browse</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/messages">Messages</Link>

            <button
              onClick={logout}
              style={{
                background: "#111",
                color: "white",
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
