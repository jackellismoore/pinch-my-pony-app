'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHorseAvailability } from '@/app/dashboard/owner/hooks/useHorseAvailability';

function badgeStyle(kind: 'blocked' | 'booking') {
  const base: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    border: '1px solid rgba(0,0,0,0.12)',
    marginRight: 8,
  };
  if (kind === 'blocked') return { ...base, background: 'rgba(255, 200, 0, 0.18)' };
  return { ...base, background: 'rgba(0, 180, 255, 0.15)' };
}

export default function OwnerHorseAvailabilityPage() {
  const params = useParams<{ horseId: string }>();
  const horseId = params?.horseId ?? null;
  const router = useRouter();

  const {
    blocked,
    bookings,
    unavailableRanges,
    loading,
    error,
    addBlockedRange,
    deleteBlockedRange,
  } = useHorseAvailability(horseId);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const disabled = !startDate || !endDate || submitting;

  const headerSubtitle = useMemo(() => {
    const total = unavailableRanges.length;
    return `${total} unavailable range${total === 1 ? '' : 's'} (blocked + approved bookings)`;
  }, [unavailableRanges.length]);

  async function onAddBlocked(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    try {
      setSubmitting(true);
      await addBlockedRange({ startDate, endDate, reason });

      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Failed to add blocked range');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteBlock(id: string) {
    if (!confirm('Delete this blocked range?')) return;
    try {
      await deleteBlockedRange(id);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to delete blocked range');
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={() => router.back()}
          style={{
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 10,
            padding: '8px 10px',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>

        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Availability</h1>
          <div style={{ marginTop: 4, color: 'rgba(0,0,0,0.65)', fontSize: 13 }}>
            {headerSubtitle}
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            border: '1px solid rgba(255,0,0,0.25)',
            background: 'rgba(255,0,0,0.06)',
            padding: 12,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Error</div>
          <div style={{ fontSize: 13 }}>{error}</div>
        </div>
      ) : null}

      <div
        style={{
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 14,
          padding: 14,
          background: 'white',
          marginBottom: 14,
        }}
      >
        <div style={{ fontWeight: 650, marginBottom: 10 }}>Add blocked date range</div>

        <form onSubmit={onAddBlocked} style={{ display: 'grid', gap: 10 }}>
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

          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Reason (optional)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vacation, maintenance, etc."
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
              }}
            />
          </label>

          {submitError ? (
            <div style={{ color: 'rgba(180,0,0,0.9)', fontSize: 13 }}>{submitError}</div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="submit"
              disabled={disabled}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                borderRadius: 12,
                padding: '10px 14px',
                background: disabled ? 'rgba(0,0,0,0.05)' : 'black',
                color: disabled ? 'rgba(0,0,0,0.5)' : 'white',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: 650,
              }}
            >
              {submitting ? 'Adding…' : 'Add blocked range'}
            </button>

            {loading ? (
              <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Refreshing…</span>
            ) : null}
          </div>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div
          style={{
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 14,
            padding: 14,
            background: 'white',
          }}
        >
          <div style={{ fontWeight: 650, marginBottom: 10 }}>Blocked ranges</div>

          {blocked.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
              No blocked ranges yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {blocked.map((b) => (
                <div
                  key={b.id}
                  style={{
                    border: '1px solid rgba(0,0,0,0.10)',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={badgeStyle('blocked')}>Blocked</span>
                      <div style={{ fontWeight: 650, fontSize: 14 }}>
                        {b.start_date} → {b.end_date}
                      </div>
                    </div>
                    {b.reason ? (
                      <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.7)' }}>
                        {b.reason}
                      </div>
                    ) : null}
                  </div>

                  <button
                    onClick={() => onDeleteBlock(b.id)}
                    style={{
                      border: '1px solid rgba(0,0,0,0.14)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      background: 'white',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 14,
            padding: 14,
            background: 'white',
          }}
        >
          <div style={{ fontWeight: 650, marginBottom: 10 }}>Approved bookings (read-only)</div>

          {bookings.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
              No approved bookings.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {bookings.map((br) => (
                <div
                  key={br.id}
                  style={{
                    border: '1px solid rgba(0,0,0,0.10)',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={badgeStyle('booking')}>Booking</span>
                    <div style={{ fontWeight: 650, fontSize: 14 }}>
                      {br.start_date} → {br.end_date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
