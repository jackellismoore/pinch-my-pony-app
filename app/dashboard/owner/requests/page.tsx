'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import DashboardShell from '@/components/DashboardShell';
import RequestsTable from '@/components/RequestsTable';
import { useOwnerDashboardData } from '@/dashboard/owner/hooks/useOwnerDashboardData';
import { useMemo, useState } from 'react';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function OwnerRequestsPage() {
  const { loading, error, rows, approve, reject, remove } = useOwnerDashboardData();

  const [filter, setFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const list = (rows ?? []) as any[];
    if (filter === 'all') return list;
    return list.filter((r) => String(r?.status) === filter);
  }, [rows, filter]);

  const styles: Record<string, React.CSSProperties> = {
    wrap: { padding: 16, maxWidth: 1100, margin: '0 auto' },
    top: { display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' },
    h1: { margin: 0, fontSize: 22 },
    sub: { marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' },
    section: { marginTop: 14 },
    filters: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
    chip: (active: boolean): React.CSSProperties => ({
      border: '1px solid rgba(0,0,0,0.14)',
      borderRadius: 999,
      padding: '8px 10px',
      fontSize: 13,
      fontWeight: 900,
      background: active ? 'black' : 'white',
      color: active ? 'white' : 'black',
      cursor: 'pointer',
    }),
    err: {
      marginTop: 14,
      border: '1px solid rgba(255,0,0,0.25)',
      background: 'rgba(255,0,0,0.06)',
      padding: 12,
      borderRadius: 12,
      fontSize: 13,
    },
    btn: {
      border: '1px solid rgba(0,0,0,0.14)',
      borderRadius: 12,
      padding: '10px 12px',
      textDecoration: 'none',
      fontSize: 13,
      fontWeight: 900,
      background: 'white',
      color: 'black',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      whiteSpace: 'nowrap',
    },
  };

  return (
    <DashboardShell>
      <div style={styles.wrap}>
        <div style={styles.top}>
          <div>
            <h1 style={styles.h1}>Requests</h1>
            <div style={styles.sub}>Manage incoming borrow requests. Use Availability to block dates.</div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/owner" style={styles.btn}>
              ← Dashboard
            </Link>
            <Link href="/dashboard/owner/horses" style={styles.btn}>
              Horses
            </Link>
          </div>
        </div>

        <div style={{ ...styles.section, ...styles.filters }}>
          {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((k) => (
            <button key={k} onClick={() => setFilter(k)} style={styles.chip(filter === k)}>
              {k === 'all' ? 'All' : k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        {error ? <div style={styles.err}>{error}</div> : null}

        <div style={styles.section}>
          <RequestsTable
            rows={filtered} // ✅ no cast needed
            loading={loading}
            onApprove={approve}
            onReject={reject}
            onDelete={remove}
            title="Borrow requests"
            subtitle="Click Availability on a row to manage blocks + bookings."
            emptyLabel={loading ? 'Loading…' : 'No requests found.'}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
