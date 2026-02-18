'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AvailabilityConflictNotice } from '@/components/AvailabilityConflictNotice';

export default function RequestForm({
  horseId,
  onSuccess,
}: {
  horseId: string;
  onSuccess?: () => void;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // conflict OR loading disables submit
  const [blockedOrLoading, setBlockedOrLoading] = useState(true);

  const submitDisabled =
    submitting ||
    !startDate ||
    !endDate ||
    startDate > endDate ||
    blockedOrLoading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!startDate || !endDate) return;

    if (startDate > endDate) {
      setSubmitError('Start date must be before or equal to end date.');
      return;
    }

    if (blockedOrLoading) {
      setSubmitError('Selected dates are unavailable.');
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

      // DB hardening (fast RPC check before insert for better UX)
      const { data: ok, error: rpcErr } = await supabase.rpc('is_horse_range_available', {
        p_horse_id: horseId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_exclude_request_id: null,
      });

      if (rpcErr) {
        // If RPC blocked by RLS/etc. you'll still be protected by trigger on insert.
        // But in most setups this will work and give better UX.
      } else if (ok === false) {
        setSubmitError('Selected dates overlap an unavailable range.');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from('borrow_requests').insert({
        horse_id: horseId,
        borrower_id: user.id,
        status: 'pending',
        start_date: startDate,
        end_date: endDate,
        message: message?.trim() ? message.trim() : null,
      });

      if (error) {
        // Trigger error message from SQL will land here.
        setSubmitError(error.message);
        setSubmitting(false);
        return;
      }

      onSuccess?.();
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: '1px solid rgba(0,0,0,0.10)',
        borderRadius: 14,
        padding: 16,
        background: 'white',
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ fontWeight: 750 }}>Request Dates</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Start Date
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
          End Date (inclusive)
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

      <AvailabilityConflictNotice
        horseId={horseId}
        startDate={startDate}
        endDate={endDate}
        onConflictChange={(v) => setBlockedOrLoading(v)}
      />

      <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
        Message (optional)
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
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
        <div style={{ fontSize: 13, color: 'rgba(180,0,0,0.9)' }}>{submitError}</div>
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
        {submitting ? 'Submitting…' : 'Submit Borrow Request'}
      </button>
    </form>
  );
}
