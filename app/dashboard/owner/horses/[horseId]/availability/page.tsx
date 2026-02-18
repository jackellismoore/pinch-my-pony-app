'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHorseAvailability } from '@/dashboard/owner/hooks/useHorseAvailability';

function badgeStyle(kind: 'blocked' | 'booking') {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: 'nowrap',
  };

  if (kind === 'blocked') return { ...base, background: 'rgba(255, 170, 0, 0.10)' };
  return { ...base, background: 'rgba(0, 120, 255, 0.10)' };
}

export default function HorseAvailabilityPage() {
  const params = useParams<{ horseId: string }>();
  const horseId = params?.horseId;
  const router = useRouter();

  const {
    loading,
    error,
    blocked,
    bookings,
    refresh,
    addBlockedRange,
    deleteBlockedRange,
  } = useHorseAvailability(horseId);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const merged = useMemo(() => {
    const a = blocked.map((b) => ({
      kind: 'blocked' as const,
      id: b.id,
      start_date: b.start_date,
      end_date: b.end_date,
      label: b.reason?.trim() ? b.reason.trim() : 'Blocked',
    }));

    const b = bookings.map((br) => ({
      kind: 'booking' as const,
      id: br.id,
      start_date: br.start_date,
      end_date: br.end_date,
      label: 'Approved booking',
    }));

    return [...a, ...b].sort((x, y) => x.start_date.localeCompare(y.start_date));
  }, [blocked, bookings]);

  async function onAdd() {
    setLocalError(null);

    if (!horseId) {
      setLocalError('Missing horseId.');
      return;
    }
    if (!startDate || !endDate) {
      setLocalError('Start and end date required.');
      return;
    }
    if (startDate > endDate) {
      setLocalError('Start date must be before or equal to end date.');
      return;
    }

    try {
      setSaving(true);
      await addBlockedRange({
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
      });
      setStartDate('');
      setEndDate('');
      setReason('');
      await refresh();
    } catch (e: any) {
      setLocalError(e?.message ?? 'Failed to add block.');
    } finally {
      setSaving(false);
    }
  }

  if (!horseId) {
    return <div style={{ padding: 20 }}>Missing horseId.</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Availability</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
            Block date ranges; approved bookings show here automatically.
          </div>
        </div>

        <button
          onClick={() => router.push('/dashboard/owner/horses')}
          style={{
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'white',
            padding: '10px 12px',
            borderRadius: 12,
            cursor: 'pointer',
            fontWeight: 850,
            fontSize: 13,
          }}
        >
          Back to My Horses
        </button>
      </div>

      {(error || localError) ? (
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
          {localError ?? error}
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
        <div style={{ fontWeight: 900, fontSize: 14 }}>Add blocked range</div>

        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: '1px solid rgba(0,0,0,0.14)', borderRadius: 10, padding: '10px 12px' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            End date (inclusive)
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: '1px solid rgba(0,0,0,0.14)', borderRadius: 10, padding: '10px 12px' }}
            />
          </label>
        </div>

        <label style={{ marginTop: 10, display: 'grid', gap: 6, fontSize: 13 }}>
          Reason (optional)
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vacation, maintenance, etc."
            style={{ border: '1px solid rgba(0,0,0,0.14)', borderRadius: 10, padding: '10px 12px' }}
          />
        </label>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onAdd}
            disabled={saving}
            style={{
              border: '1px solid rgba(0,0,0,0.14)',
              background: 'black',
              color: 'white',
              padding: '10px 12px',
              borderRadius: 12,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              fontSize: 13,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Add Block'}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 14,
          padding: 14,
          background: 'white',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>Unavailable ranges</div>
          <button
            onClick={refresh}
            style={{
              border: '1px solid rgba(0,0,0,0.14)',
              background: 'white',
              padding: '8px 10px',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 850,
              fontSize: 13,
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Loading…</div>
        ) : null}

        {merged.length === 0 && !loading ? (
          <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
            No blocked ranges or bookings.
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {merged.map((r) => (
            <div
              key={`${r.kind}-${r.id}`}
              style={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={badgeStyle(r.kind)}>{r.kind === 'blocked' ? 'Blocked' : 'Booking'}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(0,0,0,0.8)', fontWeight: 800 }}>
                  {r.start_date} → {r.end_date}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                  {r.label}
                </div>
              </div>

              {r.kind === 'blocked' ? (
                <button
                  onClick={() => deleteBlockedRange(r.id)}
                  style={{
                    border: '1px solid rgba(0,0,0,0.14)',
                    background: 'white',
                    padding: '8px 10px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 850,
                    fontSize: 13,
                  }}
                >
                  Delete
                </button>
              ) : (
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>Read-only</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
