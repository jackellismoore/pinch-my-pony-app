"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  role: "owner" | "borrower";
};

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) loadProfile(data.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) loadProfile(session.user.id);
        else setProfile(null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    setProfile(data);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header
      style={{
        padding: "16px 32px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Link href="/" style={{ fontWeight: "bold", fontSize: 20 }}>
        🐴 Pinch My Pony
      </Link>

      <nav style={{ display: "flex", gap: 16 }}>
        <Link href="/browse">Browse</Link>

        {user && <Link href="/dashboard">Dashboard</Link>}

        {profile?.role === "owner" && (
          <Link href="/horse">Add Horse</Link>
        )}

        {!user && (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign up</Link>
          </>
        )}

        {user && (
          <button onClick={logout} style={{ cursor: "pointer" }}>
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
