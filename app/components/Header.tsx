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
      <style>{`
        .pmp-headerBrandBadge {
          width: 52px;
          height: 52px;
          min-width: 52px;
          min-height: 52px;
          border-radius: 16px;
          border: 1px solid rgba(15,23,42,0.10);
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,247,240,0.96));
          box-shadow: 0 10px 24px rgba(15,23,42,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 6px;
        }

        .pmp-headerBrandBadge img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          display: block;
          transform: scale(1.08);
        }

        .pmp-headerNotifWrap {
          display: inline-flex;
          align-items: center;
        }
      `}</style>

      <header className="pmp-header">
        <div className="pmp-headerInner">
          <Link href="/" className="pmp-brand" onClick={() => setMenuOpen(false)}>
            <div className="pmp-headerBrandBadge" aria-hidden="true">
              <Image src="/pmp-logo-web.png" alt="" width={40} height={40} priority />
            </div>

            <div className="pmp-brandText">
              <div className="pmp-brandTitle">Pinch My Pony</div>
              <div className="pmp-brandSub">Horse sharing marketplace</div>
            </div>
          </Link>

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

                {!menuOpen ? (
                  <div className="pmp-headerNotifWrap">
                    <NotificationBell />
                  </div>
                ) : null}
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