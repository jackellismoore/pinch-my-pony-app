"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  role: "owner" | "borrower";
};

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
    };

    loadProfile();
  }, []);

  return (
    <header
      style={{
        display: "flex",
        gap: 16,
        padding: 16,
        borderBottom: "1px solid #eee",
      }}
    >
      <Link href="/">🏇 Pinch My Pony</Link>
      <Link href="/browse">Browse</Link>

      {profile?.role === "owner" && (
        <>
          <Link href="/horse">Add Horse</Link>
          <Link href="/dashboard/owner">Owner Dashboard</Link>
        </>
      )}

      {profile?.role === "borrower" && (
        <Link href="/dashboard/borrower">My Requests</Link>
      )}

      <Link href="/login">Login</Link>
    </header>
  );
}
