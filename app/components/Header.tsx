"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header
      style={{
        padding: "12px 24px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Link href="/" style={{ fontWeight: "bold", fontSize: 18 }}>
        🐎 Pinch My Pony
      </Link>

      <nav style={{ display: "flex", gap: 16 }}>
        <Link href="/browse">Browse</Link>
        <Link href="/horse">Horses</Link>

        {!user && <Link href="/login">Login</Link>}
        {!user && <Link href="/signup">Sign up</Link>}

        {user && <Link href="/dashboard">Dashboard</Link>}
        {user && (
          <button onClick={handleLogout} style={{ cursor: "pointer" }}>
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
