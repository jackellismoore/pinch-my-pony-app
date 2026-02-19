'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type BorrowRequestRow = {
  id: string;
  horse_id: string;
  borrower_id: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  start_date: string | null;
  end_date: string | null;
  message: string | null;
  created_at: string | null;
};

type HorseMini = {
  id: string;
  name: string | null;
  owner_id: string;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  try {
    return String(d).slice(0, 10);
  } catch {
    return String(d);
  }
}

function btnLinkStyle(kind: 'primary' | 'secondary' | 'danger'): React.CSSProperties {
  const base: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.14)',
    borderRadius: 12,
    padding: '10px 12px',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
  };

  if (kind === 'primary') return { ...base, background: 'black', color: 'white' };
  if (kind === 'danger') return { ...base, background: 'rgba(255,0,0,0.06)', color: 'rgba(170,0,0,0.95)', border: '1px solid rgba(200,0,0,0.25)' };
  return { ...base, background: 'white', color: 'black' };
}

function pillStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.10)',
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: 'nowrap',
  };

  if (status === 'approved') return { ...base, background: 'rgba(0,160,60,0.10)', color: 'rgba(0,120,45,0.95)' };
  if (status === 'rejected') return { ...base, background: 'rgba(220,0,0,0.08)', color: 'rgba(170,0,0,0.95)' };
  if (status === 'pending') return { ...base, background: 'rgba(255,180,0,0.14)', color: 'rgba(125,80,0,0.95)' };
  return { ...base, background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.70)' };
}

export default function OwnerRequestDetailPage() {
  const params = useParams<{ requestId: string }>();
  const requestId = params?.requestId;

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reqRow, setReqRow] = useState<BorrowRequestRow | null>(null);
  const [horse, setHorse] = useState<HorseMini | null>(null);
  const [borrower, setBorrower] = useState<ProfileMini | null>(null);

  const availabilityHref = useMemo(() => {
    if (!reqRow?.horse_id) return null;
    return `/dashboard/owner/horses/${reqRow.horse_id}/availability`;
  }, [reqRow?.horse_id]);

  const horseEditHref = useMemo(() => {
    if (!reqRow?.horse_id) return null;
    return `/dashboard/owner/horses/edit/${reqRow.horse_id}`;
  }, [reqRow?.horse_id]);

  const borrowerLabel = useMemo(() => {
    const dn = borrower?.display_name?.trim();
    const fn = borrower?.full_name?.trim();
    return dn || fn || 'Borrower';
  }, [borrower]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!requestId) return;

      setLoading(true);
      setError(null);

      try {
        // Ensure auth exists for owner dashboard pages
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!authData.user) {
          router.push('/login');
          router.refresh();
          return;
        }

        const reqRes = await supabase
          .from('borrow_requests')
          .select('id,horse_id,borrower_id,status,start_date,end_date,message,created_at')
          .eq('id', requestId)
          .single();

        if (cancelled) return;
        if (reqRes.error) throw reqRes.error;

        const r = (reqRes.data ?? null) as BorrowRequestRow | null;
        setReqRow(r);

        if (!r) {
          setLoading(false);
          return;
        }

        const [horseRes, borrowerRes] = await Promise.all([
          supabase.from('horses').select('id,name,owner_id').eq('id', r.horse_id).single(),
          supabase
            .from('profiles')
            .select('id,display_name,full_name,avatar_url')
            .eq('id', r.borrower_id)
            .single(),
        ]);

        if (cancelled) return;

        if (!horseRes.error) setHorse((horseRes.data ?? null) as HorseMini | null);
        if (!borrowerRes.error) setBorrower((borrowerRes.data ?? null) as ProfileMini | null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load request.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [requestId, router]);

  async function setStatus(next: 'approved' | 'rejected') {
    if (!reqRow) return;

    setError(null);

    try {
      const { error: updErr } = await supabase
        .from('borrow_requests')
        .update({ status: next })
        .eq('id', reqRow.id);

      if (updErr) throw updErr;

      setReqRow({ ...reqRow, status: next });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update status.');
    }
  }

  async function deleteRequest() {
    if (!reqRow) return;

    setError(null);

    try {
      const { error: delErr } = await supabase.from('borrow_requests').delete().eq('id', reqRow.id);
      if (delErr) throw delErr;

      router.push('/dashboard/owner/requests');
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete request.');
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Request</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
            Review dates, message, and manage availability if needed.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard/owner/requests" style={btnLinkStyle('secondary')}>
            ← Back to requests
          </Link>

          {availabilityHref ? (
            <Link href={availabilityHref} style={btnLinkStyle('primary')}>
              Manage availability
            </Link>
          ) : null}

          {horseEditHref ? (
            <Link href={horseEditHref} style={btnLinkStyle('secondary')}>
              Edit horse
            </Link>
          ) : null}
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

      {!loading && !error && !reqRow ? (
        <div style={{ marginTop: 14, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>Request not found.</div>
      ) : null}

      {reqRow ? (
        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          <div
            style={{
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 14,
              background: 'white',
              padding: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
              <span style={pillStyle(reqRow.status)}>{String(reqRow.status).toUpperCase()}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, fontSize: 15 }}>
                  {horse?.name ?? 'Horse'} • {borrowerLabel}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                  {fmtDate(reqRow.start_date)} → {fmtDate(reqRow.end_date)} (inclusive)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {reqRow.status === 'pending' ? (
                <>
                  <button onClick={() => setStatus('approved')} style={btnLinkStyle('primary') as any}>
                    Approve
                  </button>
                  <button onClick={() => setStatus('rejected')} style={btnLinkStyle('secondary') as any}>
                    Reject
                  </button>
                </>
              ) : null}

              <button onClick={deleteRequest} style={btnLinkStyle('danger') as any}>
                Delete
              </button>
            </div>
          </div>

          <div
            style={{
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 14,
              background: 'white',
              padding: 14,
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 950 }}>Message</div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.80)', whiteSpace: 'pre-wrap' }}>
              {reqRow.message?.trim() ? reqRow.message.trim() : '—'}
            </div>

            <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
              Created: {fmtDate(reqRow.created_at)}
            </div>
          </div>

          {borrower ? (
            <div
              style={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 14,
                background: 'white',
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  flexShrink: 0,
                }}
              >
                {borrower.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={borrower.avatar_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : null}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, fontSize: 14 }}>{borrowerLabel}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{borrower.id}</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
