"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { registerPushForCurrentUser } from "@/lib/push/registerPush";
import NotificationBell from "@/components/NotificationBell";
import { VerificationBadge } from "@/components/VerificationBadge";
import MobileTabBar from "@/components/MobileTabBar";

type ProfileMini = {
  id: string;
  role: "owner" | "borrower" | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  verification_status: string | null;
  verified_at: string | null;
  verification_provider: string | null;
};

function displayNameOrNull(p: ProfileMini | null) {
  const dn = (p?.display_name ?? "").trim();
  const fn = (p?.full_name ?? "").trim();
  return dn || fn || null;
}

function useOutsideClick<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onOutside: () => void
) {
  useEffect(() => {
    function handler(e: any) {
      if (!ref.current || ref.current.contains(e.target)) return;
      onOutside();
    }
    window.addEventListener("mousedown", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [ref, onOutside]);
}

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useOutsideClick(menuRef, () => setMenuOpen(false));

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      setUser(u);

      if (u) {
        registerPushForCurrentUser();
        loadProfile(u.id);
      }
    }

    async function loadProfile(uid: string) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      setProfile(data ?? null);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setMenuOpen(false);

      if (u) {
        registerPushForCurrentUser();
        loadProfile(u.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // ✅ FIXED LOGOUT
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const isOwner = profile?.role === "owner";
  const isVerified = (profile?.verification_status ?? "") === "verified";

  const name = useMemo(() => displayNameOrNull(profile), [profile]);

  return (
    <>
      <header className="pmp-header">
        <div className="pmp-headerInner">
          <Link href="/" className="pmp-brand">
            <div className="pmp-headerBrandBadge">
              <Image src="/pmp-logo-web.png" alt="" width={40} height={40} />
            </div>
            <div>
              <div className="pmp-brandTitle">Pinch My Pony</div>
              <div className="pmp-brandSub">Horse sharing marketplace</div>
            </div>
          </Link>

          <div ref={menuRef} className="pmp-headerActions">
            {user && <NotificationBell />}

            <button onClick={() => setMenuOpen((v) => !v)}>☰</button>

            {menuOpen && (
              <div className="pmp-menuPanel">
                {user ? (
                  <>
                    <div>{name || user.email}</div>

                    {!isVerified && <Link href="/verify">Verify</Link>}

                    <Link href="/messages">Messages</Link>

                    {isOwner ? (
                      <Link href="/dashboard/owner">Dashboard</Link>
                    ) : (
                      <Link href="/dashboard/borrower">Dashboard</Link>
                    )}

                    <Link href="/profile">Profile</Link>

                    <button onClick={logout}>Logout</button>
                  </>
                ) : (
                  <>
                    <Link href="/login">Login</Link>
                    <Link href="/signup">Signup</Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {user && <MobileTabBar />}
    </>
  );
}