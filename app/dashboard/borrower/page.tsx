'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function BorrowerDashboardHome() {
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const [pendingRes, approvedRes] = await Promise.all([
        supabase
          .from('borrow_requests')
          .select('*', { count: 'exact', head: true })
          .eq('borrower_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('borrow_requests')
          .select('*', { count: 'exact', head: true })
          .eq('borrower_id', user.id)
          .eq('status', 'approved'),
      ]);

      if (!cancelled) {
        setPendingCount(pendingRes.count ?? 0);
        setApprovedCount(approvedRes.count ?? 0);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pmp-pageShell">
      <div>
        <div className="pmp-kicker">Borrower dashboard</div>
        <h1 className="pmp-pageTitle">Borrower Overview</h1>
        <div className="pmp-mutedText" style={{ marginTop: 6 }}>
          Browse active horses, request dates, and keep your riding plans organised.
        </div>
      </div>

      <section className="pmp-statGrid" style={{ marginTop: 16 }}>
        <article className="pmp-statCard">
          <div className="pmp-statLabel">Pending requests</div>
          <div className="pmp-statValue">{pendingCount}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">Approved rides</div>
          <div className="pmp-statValue">{approvedCount}</div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">Next action</div>
          <div className="pmp-mutedText" style={{ marginTop: 10 }}>
            Browse new horses or check messages for updates.
          </div>
        </article>

        <article className="pmp-statCard">
          <div className="pmp-statLabel">Trust tip</div>
          <div className="pmp-mutedText" style={{ marginTop: 10 }}>
            A complete profile helps owners feel more confident approving requests.
          </div>
        </article>
      </section>

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
            <div className="pmp-kicker">Checklist</div>
            <h3 className="pmp-sectionTitle">Make your account stronger</h3>
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

          <div className="pmp-horseRowCard">
            <div className="pmp-horseRowMain">
              <div className="pmp-horseThumb">💬</div>
              <div className="pmp-horseRowText">
                <h4 className="pmp-horseName">Stay on top of replies</h4>
                <div className="pmp-mutedText">Messages help you confirm details quickly and keep everything organised.</div>
              </div>
            </div>
            <div className="pmp-rowActions">
              <Link href="/messages" className="pmp-ctaSecondary">
                Open messages
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}