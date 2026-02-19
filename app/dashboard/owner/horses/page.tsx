'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type HorseRow = {
  id: string;
  owner_id: string;
  name: string | null;
  is_active: boolean | null;
  created_at?: string | null;
};

function pillStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.10)',
    background: active ? 'rgba(0,160,60,0.08)' : 'rgba(0,0,0,0.04)',
    color: active ? 'rgba(0,120,45,0.95)' : 'rgba(0,0,0,0.65)',
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: 'nowrap',
  };
}

function buttonLinkStyle(kind: 'primary' | 'secondary'): React.CSSProperties {
  const common: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.14)',
    borderRadius: 12,
    padding: '10px 12px',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  if (kind === 'primary') {
    return { ...common, background: 'black', color: 'white' };
  }
  return { ...common, background: 'white', color: 'black' };
}

export default function OwnerHorsesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const activeCount = useMemo(() => horses.filter((h) => !!h.is_active).length, [horses]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const user = auth.user;
        if (!user) {
          router.push('/login');
          router.refresh();
          return;
        }

        if (cancelled) return;
        setOwnerId(user.id);

        const { data, error } = await supabase
          .from('horses')
          .select('id,owner_id,name,is_active,created_at')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (cancelled) return;

        if (error) throw error;
        setHorses((data ?? []) as HorseRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load horses.');
        setHorses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>My Horses</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
            Manage listings and availability blocks.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div
            style={{
              border: '1px solid rgba(0,0,0,0.10)',
              background: 'rgba(0,0,0,0.03)',
              padding: '8px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 950,
              color: 'rgba(0,0,0,0.75)',
              whiteSpace: 'nowrap',
            }}
          >
            {activeCount} active / {horses.length} total
          </div>

          <Link href="/dashboard/owner/horses/add" style={buttonLinkStyle('primary')}>
            + Add horse
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 14, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Loading…</div>
      ) : null}

      {error ? (
        <div
          style={{
            marginTop: 14,
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

      {!loading && !error && horses.length === 0 ? (
        <div
          style={{
            marginTop: 14,
            border: '1px solid rgba(0,0,0,0.10)',
            background: 'white',
            padding: 14,
            borderRadius: 14,
            fontSize: 13,
            color: 'rgba(0,0,0,0.70)',
          }}
        >
          You don’t have any horses yet. Click <b>Add horse</b> to create your first listing.
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
        {horses.map((h) => (
          <div
            key={h.id}
            style={{
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 14,
              padding: 14,
              background: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 950, fontSize: 15, color: 'rgba(0,0,0,0.92)' }}>
                  {h.name ?? 'Horse'}
                </div>
                <span style={pillStyle(!!h.is_active)}>{h.is_active ? 'Active' : 'Inactive'}</span>
              </div>

              <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(0,0,0,0.60)' }}>
                ID:{' '}
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {h.id}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link
                href={`/dashboard/owner/horses/${h.id}/availability`}
                style={buttonLinkStyle('primary')}
              >
                Manage availability
              </Link>

              <Link href={`/dashboard/owner/horses/edit/${h.id}`} style={buttonLinkStyle('secondary')}>
                Edit
              </Link>

              {/* Optional: quick public view */}
              {ownerId ? (
                <Link href={`/owner/${ownerId}`} style={buttonLinkStyle('secondary')}>
                  View public
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
