'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type HorseRow = {
  id: string;
  name: string;
  is_active: boolean | null;
  owner_id: string;
};

export default function OwnerHorsesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horses, setHorses] = useState<HorseRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          setHorses([]);
          setLoading(false);
          return;
        }

        const r = await supabase
          .from('horses')
          .select('id,name,is_active,owner_id')
          .eq('owner_id', user.id)
          .order('name', { ascending: true });

        if (cancelled) return;

        if (r.error) throw r.error;
        setHorses((r.data ?? []) as HorseRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load horses.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = useMemo(() => horses.filter((h) => h.is_active !== false).length, [horses]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>My Horses</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
            {activeCount} active · Manage listings and availability.
          </div>
        </div>

        <Link
          href="/dashboard/owner/horses/add"
          style={{
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'black',
            color: 'white',
            padding: '10px 12px',
            borderRadius: 12,
            fontWeight: 900,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Add Horse
        </Link>
      </div>

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

      {loading ? (
        <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Loading…</div>
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
              <div style={{ fontWeight: 950, fontSize: 14, color: 'rgba(0,0,0,0.9)' }}>{h.name}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                {h.is_active === false ? 'Inactive' : 'Active'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link
                href={`/dashboard/owner/horses/edit/${h.id}`}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  background: 'white',
                  padding: '9px 10px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: 13,
                  textDecoration: 'none',
                  color: 'black',
                }}
              >
                Edit
              </Link>

              <Link
                href={`/dashboard/owner/horses/${h.id}/availability`}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  background: 'white',
                  padding: '9px 10px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: 13,
                  textDecoration: 'none',
                  color: 'black',
                }}
              >
                Availability
              </Link>
            </div>
          </div>
        ))}

        {!loading && horses.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
            No horses yet. Click <b>Add Horse</b>.
          </div>
        ) : null}
      </div>
    </div>
  );
}
