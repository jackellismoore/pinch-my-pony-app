"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
};

function pickName(p: ProfileMini | null) {
  const dn = (p?.display_name ?? "").trim();
  const fn = (p?.full_name ?? "").trim();
  return dn || fn || "Profile";
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data } = await withTimeout(supabase.auth.getUser(), 2500, "getUser");
        if (cancelled) return;

        const u = data.user ?? null;
        setUser(u);

        if (u) {
          registerPushForCurrentUser();

          const { data: p, error } = await supabase
            .from("profiles")
            .select("id,role,display_name,full_name,avatar_url")
            .eq("id", u.id)
            .maybeSingle();

          if (!cancelled && !error) setProfile((p ?? null) as ProfileMini | null);
        } else {
          setProfile(null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setProfile(null);
        }
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setMenuOpen(false);

      if (u) {
        registerPushForCurrentUser();
        const { data: p, error } = await supabase
          .from("profiles")
          .select("id,role,display_name,full_name,avatar_url")
          .eq("id", u.id)
          .maybeSingle();
        if (!error) setProfile((p ?? null) as ProfileMini | null);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isOwner = profile?.role === "owner";

  const brand = useMemo(() => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "black",
            color: "white",
            display: "grid",
            placeItems: "center",
            fontWeight: 950,
          }}
          aria-hidden="true"
        >
          🐴
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Pinch My Pony</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Marketplace</div>
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

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? <NotificationBell /> : null}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              background: "white",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              fontWeight: 900,
            }}
            aria-label="Menu"
            title="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 14px" }}>
          <div
            style={{
              border: "1px solid rgba(15,23,42,0.10)",
              borderRadius: 18,
              background: "white",
              padding: 12,
              display: "grid",
              gap: 8,
            }}
          >
            {user ? (
              <>
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

          {user ? (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>
              Signed in as <span style={{ fontWeight: 800 }}>{pickName(profile)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
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
