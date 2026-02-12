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

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole(data?.role || null);
    } else {
      setRole(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header style={headerStyle}>
      <Link href="/" style={logoStyle}>
        🐴 Pinch My Pony
      </Link>

      <nav style={navStyle}>
        {user ? (
          <>
            <Link href="/browse">Browse</Link>

            {role === "owner" && (
              <Link href="/dashboard/owner/horses">
                My Horses
              </Link>
            )}

            <Link href="/messages">Messages</Link>

            <Link href="/dashboard">Dashboard</Link>

            <button onClick={handleLogout} style={logoutButton}>
              Logout
            </button>
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

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 40px",
  borderBottom: "1px solid #eee",
  background: "#ffffff",
};

const logoStyle = {
  fontWeight: "bold",
  fontSize: "20px",
  textDecoration: "none",
  color: "#111",
};

const navStyle = {
  display: "flex",
  gap: "20px",
  alignItems: "center",
};

const logoutButton = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};
