'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, SUPABASE_ENV_OK } from '@/lib/supabaseClient';
import { registerPushForCurrentUser } from '@/lib/push/registerPush';

type ProfileMini = {
  id: string;
  role: 'owner' | 'borrower' | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
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
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(userId: string) {
      try {
        const r = await supabase
          .from('profiles')
          .select('id,role,display_name,full_name,avatar_url')
          .eq('id', userId)
          .single();

        if (cancelled) return;

        if (!r.error) setProfile((r.data ?? null) as ProfileMini | null);
      } catch {
        // ignore
      }
    }

    async function boot() {
      setLoading(true);
      setAuthError(null);

      try {
        // 1) quick local session read
        const sessionRes = await withTimeout(supabase.auth.getSession(), 2500, 'getSession');
        if (cancelled) return;

        const sessionUser = sessionRes.data.session?.user ?? null;
        setUser(sessionUser);
        setLoading(false);

        if (!sessionUser) {
          setProfile(null);
          return;
        }

        // Fire-and-forget push
        registerPushForCurrentUser();

        // Fire-and-forget profile fetch (not blocking UI)
        loadProfile(sessionUser.id);

        // 2) optional network check
        try {
          const userRes = await withTimeout(supabase.auth.getUser(), 2500, 'getUser');
          if (cancelled) return;
          setUser(userRes.data.user ?? sessionUser);
        } catch {
          // ignore
        }
      } catch (e: any) {
        if (cancelled) return;
        setAuthError(e?.message ?? 'Auth init failed.');
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;

      setAuthError(null);
      setUser(session?.user ?? null);
      setLoading(false);

      if (!session?.user) {
        setProfile(null);
        return;
      }

      registerPushForCurrentUser();
      loadProfile(session.user.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const label = useMemo(() => {
    const dn = profile?.display_name?.trim();
    const fn = profile?.full_name?.trim();
    return dn || fn || 'Profile';
  }, [profile]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

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
        {!SUPABASE_ENV_OK ? (
          <div style={{ fontSize: 13, color: 'rgba(180,0,0,0.9)', fontWeight: 800 }}>
            Missing Supabase env vars (check Vercel settings)
          </div>
        ) : loading ? (
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
