"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logout } from "@/lib/auth";

export default function Header() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header
      style={{
        padding: "16px 24px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 700,
          fontSize: 20,
          textDecoration: "none",
        }}
      >
        🐎 Pinch My Pony
      </Link>

      <nav style={{ display: "flex", gap: 16 }}>
        <Link href="/browse">Browse</Link>

        {loggedIn ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  );
}
