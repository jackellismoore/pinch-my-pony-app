"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

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

    if (profile) setRole(profile.role);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const NavItem = ({
    href,
    label,
  }: {
    href: string;
    label: string;
  }) => (
    <Link href={href} style={{ textDecoration: "none" }}>
      <span
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          fontWeight: 500,
          cursor: "pointer",
          background:
            pathname === href ? "#2563eb" : "transparent",
          color:
            pathname === href ? "white" : "#1f2937",
          transition: "0.2s ease",
        }}
      >
        {label}
      </span>
    </Link>
  );

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
      {/* LEFT */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: 18,
            textDecoration: "none",
            color: "#111",
          }}
        >
          🐴 Pinch My Pony
        </Link>

        {user && (
          <>
            <NavItem href="/browse" label="Browse" />

            {role === "owner" && (
              <>
                <NavItem href="/dashboard/owner" label="Dashboard" />
                <NavItem
                  href="/dashboard/owner/horses"
                  label="My Horses"
                />
              </>
            )}

            {role === "borrower" && (
              <NavItem href="/dashboard/borrower" label="Dashboard" />
            )}

            <NavItem href="/messages" label="Messages" />
          </>
        )}
      </div>

      {/* RIGHT */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {user ? (
          <>
            <NotificationBell />

            <button
              onClick={handleLogout}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <NavItem href="/login" label="Login" />
            <NavItem href="/signup" label="Sign Up" />
          </>
        )}
      </div>
    </header>
  );
}
