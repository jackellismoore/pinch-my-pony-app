"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

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
    window.location.href = "/login";
  };

  const navButton = {
    padding: "8px 14px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 500,
    fontSize: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#111",
  };

  const primaryButton = {
    ...navButton,
    background: "#2563eb",
    color: "#fff",
    border: "none",
  };

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet/dist/leaflet.css"
        />
      </head>

      <body style={{ margin: 0, fontFamily: "Inter, sans-serif" }}>
        <header
          style={{
            padding: "16px 40px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 22,
              fontWeight: 700,
              textDecoration: "none",
              color: "#111",
            }}
          >
            🐎 Pinch My Pony
          </Link>

          <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {user && (
              <Link href="/browse" style={navButton}>
                Browse
              </Link>
            )}

            {user && role === "owner" && (
              <Link href="/horse" style={navButton}>
                Add Horse
              </Link>
            )}

            {user && role === "owner" && (
              <Link href="/dashboard/owner" style={navButton}>
                Owner Dashboard
              </Link>
            )}

            {user && role === "borrower" && (
              <Link href="/dashboard/borrower" style={navButton}>
                My Requests
              </Link>
            )}

            {user && (
              <Link href="/profile" style={navButton}>
                Profile
              </Link>
            )}

            {!user && (
              <>
                <Link href="/login" style={navButton}>
                  Login
                </Link>
                <Link href="/signup" style={primaryButton}>
                  Sign Up
                </Link>
              </>
            )}

            {user && (
              <button
                onClick={handleLogout}
                style={{
                  ...primaryButton,
                  background: "#dc2626",
                }}
              >
                Logout
              </button>
            )}
          </nav>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
