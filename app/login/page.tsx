'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      const res = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (res.error) throw res.error;

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
