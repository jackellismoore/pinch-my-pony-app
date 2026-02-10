"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

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

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header
      style={{
        padding: 16,
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Link href="/" style={{ fontWeight: "bold", fontSize: 20 }}>
        🐎 Pinch My Pony
      </Link>

      <nav style={{ display: "flex", gap: 12 }}>
        <Link href="/browse">Browse</Link>

        {loggedIn && <Link href="/horse">Add Horse</Link>}

        {!loggedIn && <Link href="/login">Login</Link>}
        {!loggedIn && <Link href="/signup">Sign up</Link>}

        {loggedIn && (
          <button onClick={logout} style={{ cursor: "pointer" }}>
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
