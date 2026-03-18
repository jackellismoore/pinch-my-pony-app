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
    function onDown(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onOutside();
    }

    function onTouch(e: TouchEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onOutside();
    }

    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onTouch);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [ref, onOutside]);
}

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const router = useRouter();
  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  useOutsideClick(menuWrapRef, () => setMenuOpen(false));

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(uid: string) {
      setProfileLoading(true);
      try {
        const { data: p, error } = await supabase
          .from("profiles")
          .select(
            "id,role,display_name,full_name,avatar_url,verification_status,verified_at,verification_provider"
          )
          .eq("id", uid)
          .maybeSingle();

        if (!cancelled && !error) setProfile((p ?? null) as ProfileMini | null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    async function init() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;

      if (cancelled) return;

      setUser(u);

      if (u) {
        registerPushForCurrentUser();
        await loadProfile(u.id);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        setMenuOpen(false);

        if (u) {
          registerPushForCurrentUser();
          await loadProfile(u.id);
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setMenuOpen(false);
    setUser(null);
    setProfile(null);
    setProfileLoading(false);

    const { error } = await supabase.auth.signOut();
    router.replace("/");
    router.refresh();

    if (error) {
      console.error("Logout error:", error.message);
    }
  };

  const isOwner = profile?.role === "owner";
  const isVerified = (profile?.verification_status ?? "unverified") === "verified";

  const signedInLabel = useMemo(() => {
    if (!user) return null;
    const name = displayNameOrNull(profile);
    if (name) return name;
    if (profileLoading) return "Loading…";
    return user.email ?? "Signed in";
  }, [user, profile, profileLoading]);

  return (
    <>
      <header className="pmp-header">
        <div className="pmp-headerInner">
          <Link href="/" className="pmp-brand" onClick={() => setMenuOpen(false)}>
            <div className="pmp-brandBadge" aria-hidden="true">
              <Image
                src="/pmp-logo.png"
                alt=""
                width={32}
                height={32}
                priority
                style={{ width: 32, height: 32, objectFit: "contain" }}
              />
            </div>

            <div className="pmp-brandText">
              <div className="pmp-brandTitle">Pinch My Pony</div>
              <div className="pmp-brandSub">Horse sharing marketplace</div>
            </div>
          </Link>

          <div className="pmp-desktopLinks">
            <Link href="/browse" className="pmp-topLink">
              Browse
            </Link>
            <Link href="/faq" className="pmp-topLink">
              FAQs
            </Link>
            <Link href="/contact" className="pmp-topLink">
              Contact
            </Link>
          </div>

          <div ref={menuWrapRef} className="pmp-headerActions">
            {user ? (
              <>
                {!isVerified ? (
                  <Link href="/verify" title="Verification required" className="pmp-hideOnSmall">
                    <VerificationBadge
                      status={profile?.verification_status ?? "unverified"}
                      verifiedAt={profile?.verified_at ?? null}
                      provider={profile?.verification_provider ?? null}
                      compact
                    />
                  </Link>
                ) : (
                  <div title="Verified" className="pmp-hideOnSmall">
                    <VerificationBadge
                      status={profile?.verification_status ?? "verified"}
                      verifiedAt={profile?.verified_at ?? null}
                      provider={profile?.verification_provider ?? null}
                      compact
                    />
                  </div>
                )}

                <div className="pmp-hideOnSmall">
                  <NotificationBell />
                </div>
              </>
            ) : null}

            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`pmp-menuButton${menuOpen ? " is-open" : ""}`}
              aria-label="Menu"
              aria-expanded={menuOpen}
              title="Menu"
              type="button"
            >
              ☰
            </button>

            {menuOpen ? (
              <div className="pmp-menuPanel">
                {user ? (
                  <>
                    <div className="pmp-menuUser">
                      <div className="pmp-menuUserLabel">Signed in as</div>
                      <div className="pmp-menuUserName">{signedInLabel}</div>
                    </div>

                    {!isVerified ? (
                      <Link href="/verify" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                        Verify Identity
                      </Link>
                    ) : null}

                    <Link href="/browse" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                      Browse Horses
                    </Link>

                    <Link href="/messages" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                      Messages
                    </Link>

                    {isOwner ? (
                      <Link
                        href="/dashboard/owner"
                        onClick={() => setMenuOpen(false)}
                        className="pmp-menuItem"
                      >
                        Owner Dashboard
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard/borrower"
                        onClick={() => setMenuOpen(false)}
                        className="pmp-menuItem"
                      >
                        Rider Dashboard
                      </Link>
                    )}

                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                      Profile
                    </Link>

                    <Link href="/faq" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                      FAQs
                    </Link>

                    <Link href="/contact" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                      Contact Us
                    </Link>

                    <button onClick={logout} className="pmp-menuLogout" type="button">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                      Login
                    </Link>

                    <Link href="/signup" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                      Sign Up
                    </Link>

                    <Link href="/browse" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                      Browse Horses
                    </Link>

                    <Link href="/faq" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                      FAQs
                    </Link>

                    <Link href="/contact" onClick={() => setMenuOpen(false)} className="pmp-menuItem">
                      Contact Us
                    </Link>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {user ? <MobileTabBar /> : null}
    </>
  );
}