"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header
      style={{
        padding: 20,
        borderBottom: "1px solid #ddd",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <div>
        <Link href="/">🐎 Pinch My Pony</Link>
      </div>

      <nav style={{ display: "flex", gap: 20 }}>
        <Link href="/browse">Browse</Link>

        {user ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/profile">Profile</Link>
            <button onClick={logout}>Logout</button>
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
