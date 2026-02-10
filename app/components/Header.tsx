"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

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
  }

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
      <Link href="/" style={{ fontSize: 20, fontWeight: 700 }}>
        🐎 Pinch My Pony
      </Link>

      <nav style={{ display: "flex", gap: 16 }}>
        <Link href="/browse">Browse</Link>
        <Link href="/horse">Horses</Link>

        {user ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <button onClick={handleLogout}>Logout</button>
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
