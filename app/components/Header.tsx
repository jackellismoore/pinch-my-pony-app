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
    router.push("/");
    router.refresh();
  };

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 30px",
        borderBottom: "1px solid #eee",
        background: "white",
      }}
    >
      <Link href="/" style={{ fontWeight: 700, fontSize: 18 }}>
        🐴 Pinch My Pony
      </Link>

      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {user && (
          <>
            <Link href="/browse">Browse</Link>
            <Link href="/messages">Messages</Link>
            <Link href="/dashboard/owner">Dashboard</Link>
            <Link href="/dashboard/owner/horses">My Horses</Link>
            <button
              onClick={logout}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "#f3f3f3",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        )}

        {!user && (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </header>
  );
}
