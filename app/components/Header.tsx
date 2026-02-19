'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { registerPushForCurrentUser } from '@/lib/push/registerPush';

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'borrower' | null;
};

function MenuIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const router = useRouter();

  const displayLabel = useMemo(() => {
    const dn = profile?.display_name?.trim();
    const fn = profile?.full_name?.trim();
    return dn || fn || 'Account';
  }, [profile]);

  const avatarUrl = useMemo(() => {
    const url = profile?.avatar_url?.trim();
    return url ? url : null;
  }, [profile]);

  async function fetchProfile(userId: string) {
    try {
      const res = await supabase
        .from('profiles')
        .select('id,display_name,full_name,avatar_url,role')
        .eq('id', userId)
        .single();

      if (!res.error) setProfile((res.data ?? null) as ProfileMini | null);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      setUser(data.user ?? null);

      if (data.user) {
        registerPushForCurrentUser();
        fetchProfile(data.user.id);
      } else {
        setProfile(null);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setMenuOpen(false);

      if (session?.user) {
        registerPushForCurrentUser();
        fetchProfile(session.user.id);
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
    setMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const nav = user
    ? [
        { label: 'Browse', href: '/browse' },
        { label: 'Messages', href: '/messages' },
        { label: 'Owner Dashboard', href: '/dashboard/owner' },
        { label: 'Profile', href: '/profile' },
      ]
    : [
        { label: 'Login', href: '/login' },
        { label: 'Sign Up', href: '/signup' },
      ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
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
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'black' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 950,
              fontSize: 16,
            }}
          >
            🐴
          </div>

          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontWeight: 950, fontSize: 15 }}>Pinch My Pony</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.60)', marginTop: 2 }}>Marketplace</div>
          </div>
        </Link>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {user ? <NotificationBell /> : null}

          {user ? (
            <Link
              href="/profile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                textDecoration: 'none',
                color: 'black',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 999,
                padding: '6px 10px',
                background: 'white',
              }}
              title="Profile"
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 950,
                }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (displayLabel?.[0] ?? 'P').toUpperCase()
                )}
              </div>

              <div style={{ fontSize: 13, fontWeight: 950 }}>Profile</div>
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'white',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
            <div
              style={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 16,
                background: 'white',
                padding: 12,
              }}
            >
              <div style={{ display: 'grid', gap: 8 }}>
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      textDecoration: 'none',
                      color: 'black',
                      fontWeight: 950,
                      fontSize: 14,
                      padding: 12,
                      borderRadius: 14,
                      background: 'rgba(0,0,0,0.04)',
                    }}
                  >
                    {item.label}
                  </Link>
                ))}

                {user ? (
                  <button
                    onClick={logout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      fontWeight: 950,
                      fontSize: 14,
                      padding: 12,
                      borderRadius: 14,
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Logout
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
