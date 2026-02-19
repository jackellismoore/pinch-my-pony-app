'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import RequestsTable from '@/components/RequestsTable';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function chipStyle(active: boolean): React.CSSProperties {
  return {
    border: '1px solid rgba(0,0,0,0.14)',
    borderRadius: 999,
    padding: '8px 10px',
    fontSize: 13,
    fontWeight: 900,
    background: active ? 'black' : 'white',
    color: active ? 'white' : 'black',
    cursor: 'pointer',
  };
}

export default function OwnerRequestsPage() {
  // TEMP: page compiles even if your hook is currently broken elsewhere.
  const loading = false;
  const error: string | null = null;
  const rows: any[] = [];

  const [filter, setFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => String(r?.status) === filter);
  }, [rows, filter]);

  const styles = {
    wrap: { padding: 16, maxWidth: 1100, margin: '0 auto' as const },
    top: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'end',
      gap: 12,
      flexWrap: 'wrap' as const,
    },
    h1: { margin: 0, fontSize: 22 },
    sub: { marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' },
    section: { marginTop: 14 },
    filters: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const },
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
      whiteSpace: 'nowrap' as const,
    },
    tip: { marginTop: 14, fontSize: 13, color: 'rgba(0,0,0,0.60)' },
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <div>
          <h1 style={styles.h1}>Requests</h1>
          <div style={styles.sub}>Manage incoming borrow requests. Availability button opens the calendar.</div>
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
          <button key={k} onClick={() => setFilter(k)} style={chipStyle(filter === k)}>
            {k === 'all' ? 'All' : k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      {error ? <div style={styles.err}>{error}</div> : null}

      <div style={styles.section}>
        <RequestsTable
          rows={filtered}
          loading={loading}
          title="Borrow requests"
          subtitle="(Temporarily disconnected while we fix the hook import mismatch)"
          emptyLabel="No requests."
        />
      </div>

      <div style={styles.tip}>Once this file is green, we reconnect the hook in a single safe patch.</div>
    </div>
  );
}
