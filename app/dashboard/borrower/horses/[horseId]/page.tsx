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

  // AvailabilityConflictNotice reports: loading OR conflict => disable submit
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
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <button
        onClick={() => router.back()}
        style={{
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 10,
          padding: '8px 10px',
          background: 'white',
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        ← Back
      </button>

      <h1 style={{ margin: 0, fontSize: 22 }}>Request dates</h1>
      <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
        {loadingHorse ? 'Loading horse…' : horse ? `Horse: ${horse.name ?? 'Unnamed horse'}` : ''}
      </div>

      {horseError ? (
        <div
          style={{
            marginTop: 12,
            border: '1px solid rgba(255,0,0,0.25)',
            background: 'rgba(255,0,0,0.06)',
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {horseError}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 14,
          padding: 14,
          background: 'white',
        }}
      >
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 14,
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
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 14,
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
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                resize: 'vertical',
              }}
            />
          </label>

          {submitError ? (
            <div style={{ color: 'rgba(180,0,0,0.9)', fontSize: 13 }}>{submitError}</div>
          ) : null}

          <button
            type="submit"
            disabled={submitDisabled}
            style={{
              border: '1px solid rgba(0,0,0,0.14)',
              borderRadius: 12,
              padding: '10px 14px',
              background: submitDisabled ? 'rgba(0,0,0,0.05)' : 'black',
              color: submitDisabled ? 'rgba(0,0,0,0.5)' : 'white',
              cursor: submitDisabled ? 'not-allowed' : 'pointer',
              fontWeight: 650,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit borrow request'}
          </button>
        </form>
      </div>
    </div>
  );
}
