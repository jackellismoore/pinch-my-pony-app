'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, SUPABASE_ENV_OK } from '@/lib/supabaseClient';

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

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setLoading(true);
    setError(null);

    try {
      if (!SUPABASE_ENV_OK) {
        throw new Error(
          'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        );
      }

      const res = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        6000,
        'signInWithPassword'
      );

      // supabase-js v2 returns { data, error }
      // @ts-ignore
      if (res?.error) throw res.error;

      router.push('/browse');
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Login</h1>

      {!SUPABASE_ENV_OK ? (
        <div
          style={{
            marginTop: 12,
            border: '1px solid rgba(255,0,0,0.25)',
            background: 'rgba(255,0,0,0.06)',
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
            color: 'rgba(180,0,0,0.95)',
            fontWeight: 800,
          }}
        >
          Missing Supabase env vars (check Vercel Project Settings).
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginTop: 12,
            border: '1px solid rgba(255,0,0,0.25)',
            background: 'rgba(255,0,0,0.06)',
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ border: '1px solid rgba(0,0,0,0.14)', borderRadius: 10, padding: '10px 12px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ border: '1px solid rgba(0,0,0,0.14)', borderRadius: 10, padding: '10px 12px' }}
          />
        </label>

        <button
          onClick={login}
          disabled={loading}
          style={{
            marginTop: 6,
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'black',
            color: 'white',
            padding: '10px 12px',
            borderRadius: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 900,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>

        <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
          No account? <Link href="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
