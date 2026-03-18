'use client';

import Link from 'next/link';

export default function BorrowerDashboardHome() {
  return (
    <div className="pmp-pageShell">
      <div>
        <div className="pmp-kicker">Borrower dashboard</div>
        <h1 className="pmp-pageTitle">Borrower Overview</h1>
        <div className="pmp-mutedText" style={{ marginTop: 6 }}>
          Browse active horses, request dates, and keep your riding plans organised.
        </div>
      </div>

      <section className="pmp-heroCard" style={{ marginTop: 16 }}>
        <div>
          <div className="pmp-kicker">Get started</div>
          <h2 className="pmp-heroTitle">Find the right horse and make a confident request.</h2>
          <p className="pmp-heroText">
            Requests are automatically blocked if dates overlap unavailable ranges or approved bookings.
          </p>
        </div>

        <div className="pmp-heroActions">
          <Link href="/dashboard/borrower/horses" className="pmp-ctaPrimary">
            Browse Horses
          </Link>
          <Link href="/messages" className="pmp-ctaSecondary">
            Open Messages
          </Link>
        </div>
      </section>

      <section className="pmp-sectionCard">
        <div className="pmp-sectionHeader">
          <div>
            <div className="pmp-kicker">Tips</div>
            <h3 className="pmp-sectionTitle">Make your profile stronger</h3>
          </div>
        </div>

        <div className="pmp-listStack">
          <div className="pmp-horseRowCard">
            <div className="pmp-horseRowMain">
              <div className="pmp-horseThumb">🪪</div>
              <div className="pmp-horseRowText">
                <h4 className="pmp-horseName">Complete verification</h4>
                <div className="pmp-mutedText">A verified account builds more trust with owners.</div>
              </div>
            </div>
            <div className="pmp-rowActions">
              <Link href="/verify" className="pmp-ctaSecondary">
                Verify
              </Link>
            </div>
          </div>

          <div className="pmp-horseRowCard">
            <div className="pmp-horseRowMain">
              <div className="pmp-horseThumb">👤</div>
              <div className="pmp-horseRowText">
                <h4 className="pmp-horseName">Add a photo and bio</h4>
                <div className="pmp-mutedText">A complete profile helps owners feel more confident approving requests.</div>
              </div>
            </div>
            <div className="pmp-rowActions">
              <Link href="/profile" className="pmp-ctaSecondary">
                Update profile
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}