'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { registerPushForCurrentUser } from '@/lib/push/registerPush';

type ProfileMini = {
  id: string;
  role: 'owner' | 'borrower' | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setAuthError(null);

      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (cancelled) return;

        setUser(data.user ?? null);

        if (data.user) {
          registerPushForCurrentUser();

          const profRes = await supabase
            .from('profiles')
            .select('id,role,display_name,full_name,avatar_url')
            .eq('id', data.user.id)
            .single();

          if (!cancelled) {
            if (profRes.error) {
              setProfile(null);
            } else {
              setProfile((profRes.data ?? null) as ProfileMini | null);
            }
          }
        } else {
          setProfile(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setAuthError(e?.message ?? 'Auth failed.');
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        registerPushForCurrentUser();
        const profRes = await supabase
          .from('profiles')
          .select('id,role,display_name,full_name,avatar_url')
          .eq('id', session.user.id)
          .single();

        if (!cancelled) setProfile((profRes.data ?? null) as ProfileMini | null);
      } else {
        setProfile(null);
      }

      setLoading(false);
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

  const label =
    (profile?.display_name && profile.display_name.trim()) ||
    (profile?.full_name && profile.full_name.trim()) ||
    'Account';

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 30px',
        borderBottom: '1px solid #eee',
        background: 'white',
      }}
    >
      <Link href="/" style={{ fontWeight: 700, fontSize: 18, textDecoration: 'none', color: 'black' }}>
        🐴 Pinch My Pony
      </Link>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {loading ? (
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Loading…</div>
        ) : authError ? (
          <div style={{ fontSize: 13, color: 'rgba(180,0,0,0.9)' }}>{authError}</div>
        ) : user ? (
          <>
            <Link href="/browse">Browse</Link>
            <Link href="/messages">Messages</Link>
            <Link href="/profile">{label}</Link>

            {profile?.role === 'owner' ? (
              <>
                <Link href="/dashboard/owner">Dashboard</Link>
                <Link href="/dashboard/owner/horses">My Horses</Link>
              </>
            ) : (
              <Link href="/dashboard/borrower">Dashboard</Link>
            )}

            <button
              onClick={logout}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid #ddd',
                background: '#f3f3f3',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </header>
  );
}
