'use client';

import Link from 'next/link';

export default function BorrowerDashboardHome() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Borrower Overview</h1>
      <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
        Browse active horses and request dates. Availability blocks + approved bookings are enforced.
      </div>

      <div
        style={{
          marginTop: 16,
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 14,
          padding: 14,
          background: 'white',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 750 }}>Get started</div>

          <Link
            href="/dashboard/borrower/horses"
            style={{
              border: '1px solid rgba(0,0,0,0.14)',
              background: 'black',
              color: 'white',
              padding: '10px 14px',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 650,
              whiteSpace: 'nowrap',
            }}
          >
            Browse Horses →
          </Link>
        </div>

        <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
          Requests will be blocked if your chosen dates overlap unavailable ranges (owner blocks + approved bookings).
        </div>
      </div>
    </div>
  );
}
