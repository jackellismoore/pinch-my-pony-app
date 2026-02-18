'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type HorseRow = {
  id: string;
  name: string | null;
  is_active: boolean | null;
  owner_id: string;
};

export default function BorrowerHorsesPage() {
  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('horses')
        .select('id,name,is_active,owner_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setHorses((data ?? []) as HorseRow[]);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22 }}>Browse Horses</h1>
        <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
          Active horses only.
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 16, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Loading…</div>
      ) : null}

      {error ? (
        <div
          style={{
            marginTop: 16,
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
        <div style={{ marginTop: 16, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
          No active horses available right now.
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {horses.map((h) => (
          <div
            key={h.id}
            style={{
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 14,
              padding: 14,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {h.name ?? 'Unnamed horse'}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                Status: {h.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>

            <Link
              href={`/dashboard/borrower/horses/${h.id}/request`}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                background: 'black',
                color: 'white',
                padding: '10px 12px',
                borderRadius: 12,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 650,
                whiteSpace: 'nowrap',
              }}
            >
              Request Dates →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
