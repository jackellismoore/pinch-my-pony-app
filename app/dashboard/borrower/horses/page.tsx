'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import RequestsTable from '@/components/RequestsTable';

type HorseRow = {
  id: string;
  name: string | null;
  is_active: boolean | null;
  owner_id: string;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
};

function ownerLabel(p?: ProfileMini | null) {
  const dn = p?.display_name?.trim();
  const fn = p?.full_name?.trim();
  return dn || fn || 'Owner';
}

export default function BorrowerHorsesPage() {
  const [horses, setHorses] = useState<HorseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active borrows state
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [borrowsLoading, setBorrowsLoading] = useState(true);
  const [borrowsError, setBorrowsError] = useState<string | null>(null);
  const [activeBorrows, setActiveBorrows] = useState<any[]>([]);
  const [canReviewByRequestId, setCanReviewByRequestId] = useState<Record<string, boolean>>({});

  // ---- Load browse horses (existing behavior) ----
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

  // ---- Load active borrows + review eligibility ----
  useEffect(() => {
    let cancelled = false;

    async function loadBorrows() {
      setBorrowsLoading(true);
      setBorrowsError(null);

      try {
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const uid = auth?.user?.id ?? null;

        if (!uid) {
          if (!cancelled) {
            setMyUserId(null);
            setActiveBorrows([]);
            setCanReviewByRequestId({});
            setBorrowsLoading(false);
          }
          return;
        }

        if (!cancelled) setMyUserId(uid);

        // Pull borrower requests that are accepted/approved
        const { data: reqs, error: reqErr } = await supabase
          .from('borrow_requests')
          .select(
            `
            id,
            status,
            start_date,
            end_date,
            message,
            horse:horses (
              id,
              name,
              owner_id
            )
          `
          )
          .eq('borrower_id', uid)
          .in('status', ['accepted', 'approved'])
          .order('created_at', { ascending: false });

        if (reqErr) throw reqErr;

        const reqRows: any[] = (reqs ?? []) as any[];

        // Gather owner ids from joined horse.owner_id
        const ownerIds = Array.from(
          new Set(
            reqRows
              .map((r) => r?.horse?.owner_id)
              .filter((v) => typeof v === 'string' && v.length > 0)
          )
        ) as string[];

        // Fetch owner profiles (batch)
        let ownersById: Record<string, ProfileMini> = {};
        if (ownerIds.length > 0) {
          const { data: owners, error: ownersErr } = await supabase
            .from('profiles')
            .select('id,display_name,full_name')
            .in('id', ownerIds);

          if (!ownersErr) {
            ownersById = {};
            for (const p of (owners ?? []) as ProfileMini[]) ownersById[p.id] = p;
          }
        }

        // Normalize into RequestsTable row shape
        const tableRows = reqRows.map((r) => {
          const requestId = String(r?.id ?? '');
          const status = String(r?.status ?? 'pending');
          const horse = r?.horse ?? null;
          const horseId = horse?.id ? String(horse.id) : null;
          const ownerId = horse?.owner_id ? String(horse.owner_id) : '';
          const owner = ownerId ? ownersById[ownerId] ?? null : null;

          return {
            id: requestId,
            status,
            start_date: r?.start_date ?? null,
            end_date: r?.end_date ?? null,
            message: r?.message ?? null,

            horse: horseId ? { id: horseId, name: horse?.name ?? null } : null,
            horse_id: horseId,

            // RequestsTable second column uses getBorrowerLabel();
            // in borrower mode we want to show OWNER name there.
            borrower_name: ownerLabel(owner),
          };
        }).filter((x) => x.id);

        // Batch check existing reviews for these request IDs
        const requestIds = tableRows.map((r) => String(r.id));
        let reviewed = new Set<string>();

        if (requestIds.length > 0) {
          const { data: revs, error: revErr } = await supabase
            .from('reviews')
            .select('request_id')
            .eq('borrower_id', uid)
            .in('request_id', requestIds);

          if (revErr) {
            // fail closed: if we can't verify, disable review CTAs
            reviewed = new Set(requestIds);
          } else {
            reviewed = new Set((revs ?? []).map((x: any) => String(x.request_id)));
          }
        }

        const canMap: Record<string, boolean> = {};
        for (const row of tableRows) {
          const id = String(row.id);
          const s = String(row.status ?? '');
          const eligibleStatus = s === 'accepted' || s === 'approved';
          canMap[id] = eligibleStatus && !reviewed.has(id);
        }

        if (!cancelled) {
          setActiveBorrows(tableRows);
          setCanReviewByRequestId(canMap);
        }
      } catch (e: any) {
        if (!cancelled) {
          setBorrowsError(e?.message ?? 'Failed to load your active borrows.');
          setActiveBorrows([]);
          setCanReviewByRequestId({});
        }
      } finally {
        if (!cancelled) setBorrowsLoading(false);
      }
    }

    loadBorrows();
    return () => {
      cancelled = true;
    };
  }, []);

  const showActiveBorrows = useMemo(() => Boolean(myUserId), [myUserId]);

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22 }}>Browse Horses</h1>
        <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
          Active horses only.
        </div>
      </div>

      {/* Active Borrows */}
      {showActiveBorrows ? (
        <div style={{ marginTop: 16 }}>
          {borrowsError ? (
            <div
              style={{
                marginBottom: 12,
                border: '1px solid rgba(255,0,0,0.25)',
                background: 'rgba(255,0,0,0.06)',
                padding: 12,
                borderRadius: 12,
                fontSize: 13,
              }}
            >
              {borrowsError}
            </div>
          ) : null}

          <RequestsTable
            mode="borrower"
            title="Active borrows"
            subtitle="Accepted/approved requests. Leave a review once you’ve been accepted."
            emptyLabel={borrowsLoading ? 'Loading…' : 'No active borrows yet.'}
            requests={activeBorrows}
            showReviewCTA
            canReviewByRequestId={canReviewByRequestId}
          />
        </div>
      ) : (
        <div style={{ marginTop: 16, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
          Log in to see your active borrows.
        </div>
      )}

      {/* Existing browse list */}
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