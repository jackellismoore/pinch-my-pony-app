"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;

    setUser(currentUser);

    if (currentUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      setRole(profile?.role || null);
    }
  };

  const handleLogout = async () => {
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
        alignItems: "center",
        background: "#fff",
      }}
    >
      <Link href="/">
        <h2 style={{ cursor: "pointer" }}>
          🐎 Pinch My Pony
        </h2>
      </Link>

      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {!user && (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
          </>
        )}

        {user && (
          <>
            <Link href="/browse">Browse</Link>

            {role === "owner" && (
              <>
                <Link href="/dashboard/owner/horses">
                  My Horses
                </Link>
              </>
            )}

            <button
              onClick={handleLogout}
              style={{
                background: "#111",
                color: "white",
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
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
