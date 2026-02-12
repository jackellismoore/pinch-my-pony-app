"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    getUser();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const linkStyle = (path: string) => ({
    padding: "8px 14px",
    borderRadius: 8,
    fontWeight: 500,
    textDecoration: "none",
    background: pathname === path ? "#e0e7ff" : "transparent",
    color: "#111",
  });

  return (
    <header style={headerStyle}>
      <Link href="/" style={logoStyle}>
        🐎 Pinch My Pony
      </Link>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {user ? (
          <>
            <Link href="/browse" style={linkStyle("/browse")}>
              Browse
            </Link>

            <Link href="/dashboard" style={linkStyle("/dashboard")}>
              Dashboard
            </Link>

            <Link href="/messages" style={linkStyle("/messages")}>
              Messages
            </Link>

            <Link href="/dashboard/owner/horses" style={linkStyle("/dashboard/owner/horses")}>
              My Horses
            </Link>

            <button onClick={logout} style={logoutStyle}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={linkStyle("/login")}>
              Login
            </Link>

            <Link href="/signup" style={signupStyle}>
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "18px 40px",
  borderBottom: "1px solid #eee",
  background: "#fff",
};

const logoStyle = {
  fontSize: 22,
  fontWeight: 700,
  textDecoration: "none",
  color: "#111",
};

const logoutStyle = {
  padding: "8px 16px",
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};

const signupStyle = {
  padding: "8px 16px",
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  textDecoration: "none",
};
