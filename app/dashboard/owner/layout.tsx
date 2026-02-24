'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const palette = {
  forest: '#1F3D2B',
  saddle: '#8B5E3C',
  cream: '#F5F1E8',
  navy: '#1F2A44',
  gold: '#C8A24D',
};

export default function OwnerDashboardLayout({ children }: { children: React.ReactNode }) {
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

      const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();

      if (cancelled) return;

      if (error || !data || data.role !== 'owner') {
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
    // ✅ FIX: Overview should ONLY be active on exact /dashboard/owner
    const active =
      href === '/dashboard/owner'
        ? pathname === href
        : pathname === href || pathname.startsWith(href + '/');

    return (
      <Link
        href={href}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '12px 12px',
          borderRadius: 14,
          textDecoration: 'none',
          fontWeight: 950,
          fontSize: 14,
          color: active ? palette.forest : palette.navy,
          background: active ? 'rgba(31,61,43,0.08)' : 'rgba(255,255,255,0.72)',
          border: active ? '1px solid rgba(31,61,43,0.22)' : '1px solid rgba(31,42,68,0.12)',
          boxShadow: active ? '0 12px 30px rgba(31,61,43,0.10)' : '0 12px 28px rgba(31,42,68,0.06)',
        }}
      >
        <span>{label}</span>
        <span style={{ opacity: 0.55 }}>→</span>
      </Link>
    );
  }

  const pageBg = `radial-gradient(900px 420px at 20% 0%, rgba(200,162,77,0.18), transparent 55%),
                  radial-gradient(900px 420px at 90% 18%, rgba(31,61,43,0.14), transparent 58%),
                  linear-gradient(180deg, ${palette.cream} 0%, rgba(250,250,250,1) 68%)`;

  return (
    <div style={{ minHeight: '100vh', background: pageBg }}>
      <div
        className="pmp-owner-grid"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '18px 16px 28px',
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* SIDEBAR */}
        <aside
          style={{
            position: 'sticky',
            top: 16,
            alignSelf: 'start',
            borderRadius: 22,
            border: '1px solid rgba(31,42,68,0.12)',
            background: 'rgba(255,255,255,0.82)',
            boxShadow: '0 22px 60px rgba(31,42,68,0.10)',
            padding: 14,
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ padding: '6px 6px 2px' }}>
            <div style={{ fontSize: 16, fontWeight: 950, color: palette.navy }}>Owner Dashboard</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.72, lineHeight: 1.5 }}>
              Manage listings, requests, and availability.
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <NavLink href="/dashboard/owner" label="Overview" />
            <NavLink href="/dashboard/owner/horses" label="Horses" />
            <NavLink href="/dashboard/owner/requests" label="Requests" />
          </div>

          <div style={{ height: 1, background: 'rgba(31,42,68,0.10)', margin: '4px 0' }} />

          <div style={{ display: 'grid', gap: 10 }}>
            <Link
              href="/dashboard/owner/horses/add"
              style={{
                textDecoration: 'none',
                borderRadius: 16,
                border: '1px solid rgba(0,0,0,0.10)',
                background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
                color: 'white',
                padding: '12px 12px',
                fontWeight: 950,
                textAlign: 'center',
                boxShadow: '0 16px 40px rgba(31,61,43,0.18)',
              }}
            >
              Add a horse →
            </Link>

            <Link
              href="/browse"
              style={{
                textDecoration: 'none',
                borderRadius: 16,
                border: '1px solid rgba(31,42,68,0.14)',
                background: 'rgba(255,255,255,0.78)',
                color: palette.navy,
                padding: '12px 12px',
                fontWeight: 950,
                textAlign: 'center',
                boxShadow: '0 16px 40px rgba(31,42,68,0.06)',
              }}
            >
              View marketplace →
            </Link>
          </div>

          <div style={{ marginTop: 4 }}>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/');
              }}
              style={{
                width: '100%',
                borderRadius: 16,
                border: '1px solid rgba(31,42,68,0.14)',
                background: 'rgba(255,255,255,0.78)',
                padding: '12px 12px',
                fontSize: 13,
                fontWeight: 950,
                cursor: 'pointer',
                color: palette.navy,
              }}
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* CONTENT */}
        <main
          style={{
            borderRadius: 22,
            border: '1px solid rgba(31,42,68,0.10)',
            background: 'rgba(255,255,255,0.72)',
            boxShadow: '0 22px 60px rgba(31,42,68,0.10)',
            padding: 16,
            minHeight: 'calc(100vh - 36px)',
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .pmp-owner-grid { grid-template-columns: 1fr !important; }
          .pmp-owner-grid aside { position: relative !important; top: auto !important; }
        }
      `}</style>
    </div>
  );
}