'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { AvailabilityConflictNotice } from '@/components/AvailabilityConflictNotice';

type HorseRow = {
  id: string;
  name: string | null;
  is_active: boolean | null;
  owner_id: string;
};

export default function BorrowerRequestHorsePage() {
  const params = useParams<{ horseId: string }>();
  const horseId = params?.horseId;
  const router = useRouter();

  const [horse, setHorse] = useState<HorseRow | null>(null);
  const [loadingHorse, setLoadingHorse] = useState(true);
  const [horseError, setHorseError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [blockedOrLoading, setBlockedOrLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHorse() {
      if (!horseId) return;

      setLoadingHorse(true);
      setHorseError(null);

      const { data, error } = await supabase
        .from('horses')
        .select('id,name,is_active,owner_id')
        .eq('id', horseId)
        .single();

      if (cancelled) return;

      if (error) {
        setHorseError(error.message);
        setLoadingHorse(false);
        return;
      }

      const row = data as HorseRow;

      if (!row?.is_active) {
        setHorseError('This horse is not available.');
        setLoadingHorse(false);
        return;
      }

      setHorse(row);
      setLoadingHorse(false);
    }

    loadHorse();
    return () => {
      cancelled = true;
    };
  }, [horseId]);

  const submitDisabled =
    submitting ||
    !startDate ||
    !endDate ||
    startDate > endDate ||
    blockedOrLoading ||
    loadingHorse ||
    !!horseError;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!horseId) return;
    if (!startDate || !endDate) return;

    if (startDate > endDate) {
      setSubmitError('Start date must be <= end date.');
      return;
    }

    if (blockedOrLoading) {
      setSubmitError('Selected dates are unavailable (or availability is still loading).');
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) throw new Error('Not authenticated');

      const { error: insertErr } = await supabase.from('borrow_requests').insert({
        horse_id: horseId,
        borrower_id: user.id,
        status: 'pending',
        start_date: startDate,
        end_date: endDate,
        message: message?.trim() ? message.trim() : null,
      });

      if (insertErr) throw insertErr;

      router.replace('/dashboard/borrower/horses');
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        .pmp-request-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 767px) {
          .pmp-request-grid {
            grid-template-columns: 1fr;
          }

          .pmp-request-top {
            flex-direction: column;
            align-items: stretch !important;
          }

          .pmp-request-top > * {
            width: 100%;
          }
        }
      `}</style>

      <div className="pmp-pageShell">
        <div className="pmp-request-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 12,
              padding: '10px 12px',
              background: 'white',
              cursor: 'pointer',
              minHeight: 44,
              fontWeight: 900,
            }}
          >
            ← Back
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="pmp-kicker">Borrower flow</div>
          <h1 className="pmp-pageTitle">Request dates</h1>
          <div className="pmp-mutedText" style={{ marginTop: 6 }}>
            {loadingHorse ? 'Loading horse…' : horse ? `Horse: ${horse.name ?? 'Unnamed horse'}` : ''}
          </div>
        </div>

        {horseError ? <div className="pmp-errorBanner" style={{ marginTop: 12 }}>{horseError}</div> : null}

        <div className="pmp-sectionCard" style={{ marginTop: 14 }}>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <div className="pmp-request-grid">
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                Start date
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    border: '1px solid rgba(0,0,0,0.14)',
                    borderRadius: 12,
                    padding: '12px 12px',
                    fontSize: 16,
                    width: '100%',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                End date (inclusive)
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    border: '1px solid rgba(0,0,0,0.14)',
                    borderRadius: 12,
                    padding: '12px 12px',
                    fontSize: 16,
                    width: '100%',
                  }}
                />
              </label>
            </div>

            {horseId ? (
              <AvailabilityConflictNotice
                horseId={horseId}
                startDate={startDate}
                endDate={endDate}
                onConflictChange={(v) => setBlockedOrLoading(v)}
              />
            ) : null}

            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Message (optional)
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Add details for the owner..."
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  borderRadius: 12,
                  padding: '12px 12px',
                  fontSize: 14,
                  resize: 'vertical',
                  width: '100%',
                  minHeight: 110,
                }}
              />
            </label>

            {submitError ? (
              <div style={{ color: 'rgba(180,0,0,0.9)', fontSize: 13, fontWeight: 850 }}>{submitError}</div>
            ) : null}

            <button
              type="submit"
              disabled={submitDisabled}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                borderRadius: 14,
                padding: '12px 14px',
                background: submitDisabled ? 'rgba(0,0,0,0.05)' : 'black',
                color: submitDisabled ? 'rgba(0,0,0,0.5)' : 'white',
                cursor: submitDisabled ? 'not-allowed' : 'pointer',
                fontWeight: 900,
                minHeight: 46,
                width: '100%',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit borrow request'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}