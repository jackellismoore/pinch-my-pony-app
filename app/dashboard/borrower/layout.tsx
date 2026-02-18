'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function BorrowerDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkRole() {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        if (!cancelled) router.replace('/');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (cancelled) return;

      if (error || !data || data.role !== 'borrower') {
        router.replace('/dashboard');
        return;
      }

      setAuthorized(true);
      setLoading(false);
    }

    checkRole();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>
        Loading dashboard…
      </div>
    );
  }

  if (!authorized) return null;

  function NavLink({ href, label }: { href: string; label: string }) {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        style={{
          display: 'block',
          padding: '10px 12px',
          borderRadius: 12,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 14,
          color: 'black',
          background: active ? 'rgba(0,0,0,0.06)' : 'transparent',
          border: '1px solid rgba(0,0,0,0.10)',
        }}
      >
        {label}
      </Link>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'rgba(0,0,0,0.02)' }}>
      <div
        style={{
          width: 240,
          padding: 16,
          borderRight: '1px solid rgba(0,0,0,0.08)',
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          Borrower Dashboard
        </div>

        <NavLink href="/dashboard/borrower" label="Overview" />
        <NavLink href="/dashboard/borrower/horses" label="Horses" />

        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace('/');
            }}
            style={{
              width: '100%',
              border: '1px solid rgba(0,0,0,0.14)',
              background: 'white',
              padding: '10px 12px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: 24 }}>{children}</div>
    </div>
  );
}
