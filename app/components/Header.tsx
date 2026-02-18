'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { registerPushForCurrentUser } from '@/lib/push/registerPush';

type ProfileMini = {
  id: string;
  role: 'owner' | 'borrower' | null;
  display_name: string | null;
  full_name: string | null;
};

function navLinkStyle(active: boolean): React.CSSProperties {
  return {
    textDecoration: 'none',
    color: active ? 'black' : 'rgba(0,0,0,0.72)',
    fontWeight: active ? 950 : 850,
    fontSize: 13,
    padding: '8px 10px',
    borderRadius: 10,
    background: active ? 'rgba(0,0,0,0.06)' : 'transparent',
  };
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);

  const dashboardHref = useMemo(() => {
    if (profile?.role === 'borrower') return '/dashboard/borrower';
    if (profile?.role === 'owner') return '/dashboard/owner';
    return '/dashboard';
  }, [profile?.role]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;

        const u = data.user ?? null;
        setUserId(u?.id ?? null);
        setAuthReady(true);

        if (u?.id) {
          // best-effort push registration (don’t block render)
          try {
            registerPushForCurrentUser();
          } catch {}

          // load role for dashboard routing
          const res = await supabase
            .from('profiles')
            .select('id,role,display_name,full_name')
            .eq('id', u.id)
            .single();

          if (!cancelled) {
            if (!res.error) setProfile(res.data as ProfileMini);
          }
        } else {
          setProfile(null);
        }
      } catch {
        if (!cancelled) {
          setUserId(null);
          setProfile(null);
          setAuthReady(true);
        }
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;

      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      setAuthReady(true);

      if (u?.id) {
        try {
          registerPushForCurrentUser();
        } catch {}

        const res = await supabase
          .from('profiles')
          .select('id,role,display_name,full_name')
          .eq('id', u.id)
          .single();

        if (!cancelled) {
          if (!res.error) setProfile(res.data as ProfileMini);
          else setProfile(null);
        }
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
    router.push('/');
    router.refresh();
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: 'black',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              background: 'black',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 950,
              fontSize: 16,
            }}
          >
            🐴
          </div>
          <div style={{ display: 'grid', lineHeight: 1.1 }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>Pinch My Pony</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', fontWeight: 700 }}>
              Marketplace
            </div>
          </div>
        </Link>

        <nav style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {!authReady ? (
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', fontWeight: 800 }}>Loading…</div>
          ) : userId ? (
            <>
              <Link href="/browse" style={navLinkStyle(isActive('/browse'))}>
                Browse
              </Link>

              <Link href="/messages" style={navLinkStyle(isActive('/messages'))}>
                Messages
              </Link>

              <Link href={dashboardHref} style={navLinkStyle(isActive('/dashboard'))}>
                Dashboard
              </Link>

              <Link href="/profile" style={navLinkStyle(isActive('/profile'))}>
                Profile
              </Link>

              <button
                onClick={logout}
                style={{
                  marginLeft: 6,
                  padding: '9px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.14)',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 950,
                  fontSize: 13,
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/browse" style={navLinkStyle(isActive('/browse'))}>
                Browse
              </Link>

              <Link href="/login" style={navLinkStyle(isActive('/login'))}>
                Login
              </Link>

              <Link
                href="/signup"
                style={{
                  textDecoration: 'none',
                  color: 'white',
                  background: 'black',
                  fontWeight: 950,
                  fontSize: 13,
                  padding: '9px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.14)',
                }}
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
