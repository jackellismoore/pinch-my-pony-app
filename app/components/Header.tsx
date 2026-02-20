"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { registerPushForCurrentUser } from "@/lib/push/registerPush";
import NotificationBell from "@/components/NotificationBell";

type ProfileMini = {
  id: string;
  role: "owner" | "borrower" | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  verification_status?: string | null; // new (optional so it won't crash if column missing temporarily)
};

function displayNameOrNull(p: ProfileMini | null) {
  const dn = (p?.display_name ?? "").trim();
  const fn = (p?.full_name ?? "").trim();
  return dn || fn || null;
}

function useOutsideClick<T extends HTMLElement>(ref: React.RefObject<T | null>, onOutside: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onOutside();
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
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
          .select("id,role,display_name,full_name,avatar_url,verification_status")
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

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/login");
    router.refresh();
  };

  const isOwner = profile?.role === "owner";
  const isVerified = profile?.verification_status === "verified";

  const signedInLabel = useMemo(() => {
    if (!user) return null;
    const name = displayNameOrNull(profile);
    if (name) return name;
    if (profileLoading) return "Loading…";
    return user.email ?? "Signed in";
  }, [user, profile, profileLoading]);

  const brand = useMemo(() => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(245,241,232,0.85))",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow: "0 10px 28px rgba(15,23,42,0.10)",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          <Image src="/pmp-logo.png" alt="" width={34} height={34} priority style={{ width: 34, height: 34, objectFit: "contain" }} />
        </div>

        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontWeight: 950, fontSize: 16, letterSpacing: -0.2 }}>Pinch My Pony</div>
          <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 800 }}>Marketplace</div>
        </div>
      </div>
    );
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(15,23,42,0.10)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link href="/" style={{ textDecoration: "none", color: "#0f172a" }}>
          {brand}
        </Link>

        <div ref={menuWrapRef} style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {!isVerified ? (
                <Link
                  href="/verify"
                  style={{
                    textDecoration: "none",
                    fontWeight: 950,
                    fontSize: 12,
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(200,162,77,0.35)",
                    background: "rgba(200,162,77,0.14)",
                    color: "#0f172a",
                  }}
                  title="Verification required"
                >
                  Verification required
                </Link>
              ) : null}

              <NotificationBell />
            </div>
          ) : null}

          <button onClick={() => setMenuOpen((v) => !v)} style={iconButtonStyle(menuOpen)} aria-label="Menu" title="Menu">
            ☰
          </button>

          {menuOpen ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 54,
                width: 320,
                maxWidth: "calc(100vw - 32px)",
                border: "1px solid rgba(15,23,42,0.10)",
                borderRadius: 18,
                background: "white",
                boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
                padding: 12,
                display: "grid",
                gap: 8,
                zIndex: 60,
              }}
            >
              {user ? (
                <>
                  {!isVerified ? (
                    <Link href="/verify" onClick={() => setMenuOpen(false)} style={menuItem()}>
                      Verify Identity
                    </Link>
                  ) : null}

                  <Link href="/browse" onClick={() => setMenuOpen(false)} style={menuItem()}>
                    Browse
                  </Link>
                  <Link href="/messages" onClick={() => setMenuOpen(false)} style={menuItem()}>
                    Messages
                  </Link>

                  {isOwner ? (
                    <Link href="/dashboard/owner" onClick={() => setMenuOpen(false)} style={menuItem()}>
                      Owner Dashboard
                    </Link>
                  ) : (
                    <Link href="/dashboard/borrower" onClick={() => setMenuOpen(false)} style={menuItem()}>
                      Borrower Dashboard
                    </Link>
                  )}

                  <Link href="/profile" onClick={() => setMenuOpen(false)} style={menuItem()}>
                    Profile
                  </Link>

                  <button onClick={logout} style={menuButton()}>
                    Logout
                  </button>

                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7, padding: "0 2px" }}>
                    Signed in as <span style={{ fontWeight: 950 }}>{signedInLabel}</span>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} style={menuItem()}>
                    Login
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} style={menuItem()}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function iconButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: active ? "1px solid rgba(37,99,235,0.35)" : "1px solid rgba(15,23,42,0.12)",
    background: "white",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 900,
    color: "#0f172a",
    boxShadow: active ? "0 10px 24px rgba(37,99,235,0.10)" : "none",
    transition: "box-shadow 120ms ease, border-color 120ms ease, transform 120ms ease",
  };
}

function menuItem(): React.CSSProperties {
  return {
    padding: "14px 14px",
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.08)",
    textDecoration: "none",
    color: "#0f172a",
    fontWeight: 900,
    background: "rgba(15,23,42,0.03)",
  };
}

function menuButton(): React.CSSProperties {
  return {
    padding: "14px 14px",
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.10)",
    textDecoration: "none",
    color: "#0f172a",
    fontWeight: 950,
    background: "white",
    cursor: "pointer",
    textAlign: "left",
  };
}