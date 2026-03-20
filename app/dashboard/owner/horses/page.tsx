'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const palette = {
  forest: '#1F3D2B',
  saddle: '#8B5E3C',
  cream: '#F5F1E8',
  navy: '#1F2A44',
  gold: '#C8A24D',
};

type HorseRow = {
  id: string;
  name: string | null;
  location: string | null;
  image_url: string | null;
  is_active: boolean | null;
};

const card: React.CSSProperties = {
  borderRadius: 22,
  border: '1px solid rgba(31,42,68,0.12)',
  background: 'rgba(255,255,255,0.86)',
  boxShadow: '0 18px 50px rgba(31,42,68,0.08)',
};

const btn = (kind: 'primary' | 'secondary') =>
  ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 14,
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 950,
    whiteSpace: 'nowrap',
    border: '1px solid rgba(31,42,68,0.16)',
    background: kind === 'primary' ? `linear-gradient(180deg, ${palette.forest}, #173223)` : 'rgba(255,255,255,0.72)',
    color: kind === 'primary' ? 'white' : palette.navy,
    boxShadow: kind === 'primary' ? '0 14px 34px rgba(31,61,43,0.18)' : '0 14px 34px rgba(31,42,68,0.08)',
    minHeight: 44,
  }) as React.CSSProperties;

const input: React.CSSProperties = {
  width: '100%',
  border: '1px solid rgba(31,42,68,0.16)',
  borderRadius: 14,
  padding: '10px 12px',
  fontSize: 14,
  background: 'rgba(255,255,255,0.85)',
  outline: 'none',
  boxSizing: 'border-box',
};

function splitLocation(loc: string | null) {
  const raw = (loc ?? '').trim();
  if (!raw) return { line1: '—', line2: '' };

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return { line1: parts.join(', '), line2: '' };

  const line1 = parts[0];
  const line2 = parts.slice(1).join(', ');
  return { line1, line2 };
}

export default function OwnerHorsesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw userErr;
        if (!user) throw new Error('Not authenticated');

        const { data, error: qErr } = await supabase
          .from('horses')
          .select('id,name,location,image_url,is_active')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (qErr) throw qErr;
        if (!cancelled) setHorses((data ?? []) as HorseRow[]);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return horses;

    return horses.filter((h) => {
      const name = (h.name ?? '').toLowerCase();
      const loc = (h.location ?? '').toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [horses, search]);

  const activeCount = useMemo(() => horses.filter((h) => !!h.is_active).length, [horses]);

  return (
    <>
      <style>{`
        .pmp-ownerHorsesHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .pmp-ownerHorsesHeaderActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .pmp-ownerHorseCard {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          overflow: hidden;
          padding: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          background: linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(245,241,232,0.55) 140%);
        }

        .pmp-ownerHorseMainRow {
          display: flex;
          gap: 14px;
          align-items: center;
          min-width: 0;
          flex: 1 1 auto;
        }

        .pmp-ownerHorseText {
          min-width: 0;
          flex: 1 1 auto;
        }

        .pmp-ownerHorseName {
          font-weight: 950;
          font-size: 18px;
          color: ${palette.navy};
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pmp-ownerHorseMeta {
          margin-top: 6px;
          font-size: 13px;
          color: rgba(0,0,0,0.72);
          line-height: 1.35;
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .pmp-ownerHorseActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          flex: 0 1 320px;
          min-width: 0;
        }

        .pmp-ownerHorseActions > a {
          flex: 1 1 140px;
          min-width: 0;
          box-sizing: border-box;
        }

        @media (max-width: 767px) {
          .pmp-ownerHorsesHeader {
            align-items: stretch;
          }

          .pmp-ownerHorsesHeaderActions {
            width: 100%;
          }

          .pmp-ownerHorsesHeaderActions > a {
            flex: 1 1 100%;
          }

          .pmp-ownerHorseCard {
            flex-direction: column;
            align-items: stretch;
          }

          .pmp-ownerHorseMainRow {
            align-items: flex-start;
          }

          .pmp-ownerHorseName {
            white-space: normal;
          }

          .pmp-ownerHorseActions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            justify-content: stretch;
            flex: 1 1 auto;
          }

          .pmp-ownerHorseActions > a {
            width: 100%;
            flex: 1 1 auto;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', minWidth: 0 }}>
        <div className="pmp-ownerHorsesHeader">
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 34, letterSpacing: -0.3, color: palette.navy, fontWeight: 950 }}>
              My Horses
            </h1>
            <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.62)', lineHeight: 1.6 }}>
              {activeCount} active • {horses.length} total listings.
            </div>
          </div>

          <div className="pmp-ownerHorsesHeaderActions">
            <Link href="/dashboard/owner" style={btn('secondary')}>
              ← Overview
            </Link>
            <Link href="/dashboard/owner/horses/add" style={btn('primary')}>
              Add a horse →
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 14, ...card, padding: 12 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by horse name or location…"
            style={input}
          />
        </div>

        {loading ? <div style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>Loading…</div> : null}

        {error ? (
          <div
            style={{
              marginTop: 16,
              border: '1px solid rgba(255,0,0,0.25)',
              background: 'rgba(255,0,0,0.06)',
              padding: 12,
              borderRadius: 14,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        {!loading && !error && filtered.length === 0 ? (
          <div style={{ marginTop: 16, ...card, padding: 16 }}>
            <div style={{ fontWeight: 950, color: palette.navy }}>No matches.</div>
            <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.62)', lineHeight: 1.6 }}>
              Try a different search, or add a new horse.
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
          {filtered.map((h) => {
            const loc = splitLocation(h.location);

            return (
              <div key={h.id} className="pmp-ownerHorseCard" style={card}>
                <div className="pmp-ownerHorseMainRow">
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 18,
                      overflow: 'hidden',
                      border: '1px solid rgba(31,42,68,0.12)',
                      background: 'rgba(0,0,0,0.06)',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={h.image_url ?? '/file.svg'}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/file.svg';
                      }}
                    />
                  </div>

                  <div className="pmp-ownerHorseText">
                    <div className="pmp-ownerHorseName">{h.name ?? 'Horse'}</div>

                    <div className="pmp-ownerHorseMeta">
                      <div>
                        {loc.line1} <span style={{ opacity: 0.75 }}>•</span>{' '}
                        <span style={{ fontWeight: 900, color: palette.forest }}>
                          {h.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {loc.line2 ? <div style={{ marginTop: 2 }}>{loc.line2}</div> : null}
                    </div>
                  </div>
                </div>

                <div className="pmp-ownerHorseActions">
                  <Link href={`/dashboard/owner/horses/edit/${h.id}`} style={btn('secondary')}>
                    Edit
                  </Link>
                  <Link href={`/dashboard/owner/horses/${h.id}/availability`} style={btn('secondary')}>
                    Availability
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </>
  );
}