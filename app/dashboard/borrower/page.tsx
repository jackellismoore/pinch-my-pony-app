'use client';

import Link from 'next/link';

export default function BorrowerDashboardHome() {
  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .pmp-borrower-overview-top {
            flex-direction: column;
            align-items: stretch !important;
          }

          .pmp-borrower-overview-top > * {
            width: 100%;
          }
        }
      `}</style>

      <div className="pmp-pageShell">
        <div className="pmp-borrower-overview-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className="pmp-kicker">Borrower dashboard</div>
            <h1 className="pmp-pageTitle">Borrower Overview</h1>
            <div className="pmp-mutedText" style={{ marginTop: 6 }}>
              Browse active horses and request dates. Availability blocks + approved bookings are enforced.
            </div>
          </div>
        </div>

        <div className="pmp-sectionCard" style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontWeight: 900, color: 'rgba(0,0,0,0.82)' }}>Get started</div>

            <Link
              href="/dashboard/borrower/horses"
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                background: 'black',
                color: 'white',
                padding: '12px 14px',
                borderRadius: 12,
                textDecoration: 'none',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Browse Horses →
            </Link>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(0,0,0,0.65)', lineHeight: 1.6 }}>
            Requests will be blocked if your chosen dates overlap unavailable ranges (owner blocks + approved bookings).
          </div>
        </div>
      </div>
    </>
  );
}