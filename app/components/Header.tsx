'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import NotificationBell from '@/components/NotificationBell';
import { registerPushForCurrentUser } from '@/lib/push/registerPush';

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'borrower' | null;
};

function cleanName(v: string | null | undefined) {
  const s = (v ?? '').trim();
  return s.length ? s : null;
}

export default function Header() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const display = useMemo(() => {
    return cleanName(profile?.display_name) || cleanName(profile?.full_name) || 'Profile';
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      setUser(data.user ?? null);

      if (data.user) {
        // fire and forget push register
        registerPushForCurrentUser();

        supabase
          .from('profiles')
          .select('id,display_name,full_name,avatar_url,role')
          .eq('id', data.user.id)
          .single()
          .then((r) => {
            if (cancelled) return;
            if (!r.error) setProfile((r.data ?? null) as ProfileMini | null);
          })
          .catch(() => {});
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
        supabase
          .from('profiles')
          .select('id,display_name,full_name,avatar_url,role')
          .eq('id', session.user.id)
          .single()
          .then((r) => {
            if (cancelled) return;
            if (!r.error) setProfile((r.data ?? null) as ProfileMini | null);
          })
          .catch(() => {});
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

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 1150,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', color: 'black' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                background: 'black',
                display: 'grid',
                placeItems: 'center',
                color: 'white',
                fontWeight: 900,
              }}
            >
              🐴
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>Pinch My Pony</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Marketplace</div>
            </div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <>
              <NotificationBell />

              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menu"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: '1px solid rgba(0,0,0,0.12)',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 900,
                }}
              >
                ☰
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                href="/login"
                style={{
                  textDecoration: 'none',
                  color: 'black',
                  fontWeight: 850,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.14)',
                  background: 'white',
                }}
              >
                Login
              </Link>
              <Link
                href="/signup"
                style={{
                  textDecoration: 'none',
                  color: 'white',
                  fontWeight: 900,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.14)',
                  background: 'black',
                }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {user && menuOpen ? (
        <div style={{ maxWidth: 1150, margin: '0 auto', padding: '0 16px 14px' }}>
          <div
            style={{
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.02)',
              padding: 10,
              display: 'grid',
              gap: 8,
            }}
          >
            <Link
              href="/browse"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                textDecoration: 'none',
                color: 'black',
                fontWeight: 900,
              }}
            >
              Browse
            </Link>

            <Link
              href="/messages"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                textDecoration: 'none',
                color: 'black',
                fontWeight: 900,
                background: 'rgba(0,0,0,0.05)',
              }}
            >
              Messages
            </Link>

            <Link
              href="/dashboard/owner"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                textDecoration: 'none',
                color: 'black',
                fontWeight: 900,
              }}
            >
              Owner Dashboard
            </Link>

            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                textDecoration: 'none',
                color: 'black',
                fontWeight: 900,
              }}
            >
              Profile
            </Link>

            <button
              onClick={logout}
              style={{
                marginTop: 6,
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.14)',
                background: 'white',
                cursor: 'pointer',
                fontWeight: 900,
                textAlign: 'left',
              }}
            >
              Logout
            </button>

            <div style={{ padding: '2px 14px', fontSize: 12, opacity: 0.65 }}>
              Signed in as: {display}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
