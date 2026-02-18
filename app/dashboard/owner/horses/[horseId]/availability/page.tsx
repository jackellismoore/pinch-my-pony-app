'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHorseAvailability } from '@/dashboard/owner/hooks/useHorseAvailability';

type DayKind = 'blocked' | 'booking' | null;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function overlapsDate(dateISO: string, startISO: string, endISO: string) {
  return startISO <= dateISO && dateISO >= startISO && dateISO <= endISO;
}

export default function OwnerHorseAvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const horseId = String((params as any)?.horseId ?? '');

  const {
    blocked,
    bookings,
    loading,
    error,
    addBlockedRange,
    deleteBlockedRange,
  } = useHorseAvailability(horseId);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(new Date()));

  const monthLabel = useMemo(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.toLocaleString(undefined, { month: 'long' });
    return `${m} ${y}`;
  }, [monthCursor]);

  const calendarCells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();

    const first = new Date(year, month, 1);
    const leadingBlanks = first.getDay();
    const dim = daysInMonth(year, month);

    const cells: Array<{ dateISO: string | null; day: number | null }> = [];

    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ dateISO: null, day: null });
    }

    for (let day = 1; day <= dim; day++) {
      const d = new Date(year, month, day);
      cells.push({ dateISO: toISODate(d), day });
    }

    while (cells.length % 7 !== 0) cells.push({ dateISO: null, day: null });

    return cells;
  }, [monthCursor]);

  const dayKindByISO = useMemo(() => {
    const kinds: Record<string, DayKind> = {};
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const dim = daysInMonth(year, month);

    for (let day = 1; day <= dim; day++) {
      const dateISO = toISODate(new Date(year, month, day));

      const isBlocked = blocked.some((b: any) =>
        overlapsDate(dateISO, b.start_date, b.end_date)
      );

      if (isBlocked) {
        kinds[dateISO] = 'blocked';
        continue;
      }

      const isBooked = bookings.some((br: any) =>
        overlapsDate(dateISO, br.start_date, br.end_date)
      );

      kinds[dateISO] = isBooked ? 'booking' : null;
    }

    return kinds;
  }, [monthCursor, blocked, bookings]);

  async function onAddBlock() {
    setLocalError(null);

    if (!startDate || !endDate) {
      setLocalError('Start and end dates required.');
      return;
    }

    if (startDate > endDate) {
      setLocalError('Start must be before or equal to end.');
      return;
    }

    try {
      setSaving(true);

      const trimmed = reason.trim();

      await addBlockedRange({
        startDate,
        endDate,
        ...(trimmed ? { reason: trimmed } : {}),
      });

      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (e: any) {
      setLocalError(e?.message ?? 'Failed to add block.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Availability</h1>

      {error && (
        <div style={{ marginTop: 12, color: 'red', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Calendar */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setMonthCursor(addMonths(monthCursor, -1))}>
            ←
          </button>
          <div style={{ fontWeight: 800 }}>{monthLabel}</div>
          <button onClick={() => setMonthCursor(addMonths(monthCursor, 1))}>
            →
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
          }}
        >
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
            <div key={d} style={{ fontSize: 12, fontWeight: 700 }}>
              {d}
            </div>
          ))}

          {calendarCells.map((cell, idx) => {
            if (!cell.dateISO) {
              return <div key={idx} />;
            }

            const kind = dayKindByISO[cell.dateISO];

            const bg =
              kind === 'blocked'
                ? 'rgba(255,170,0,0.2)'
                : kind === 'booking'
                ? 'rgba(0,140,255,0.2)'
                : 'white';

            return (
              <div
                key={idx}
                style={{
                  padding: 6,
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: bg,
                  fontSize: 12,
                  borderRadius: 6,
                  textAlign: 'center',
                }}
              >
                {cell.day}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Block Form */}
      <div style={{ marginTop: 30 }}>
        <h3>Add Blocked Range</h3>

        <div style={{ display: 'flex', gap: 10 }}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <input
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button onClick={onAddBlock} disabled={saving}>
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>

        {localError && (
          <div style={{ marginTop: 8, color: 'red', fontSize: 13 }}>
            {localError}
          </div>
        )}
      </div>

      {/* Lists */}
      <div style={{ marginTop: 30 }}>
        <h3>Blocked Ranges</h3>
        {blocked.map((b: any) => (
          <div key={b.id} style={{ marginTop: 6, fontSize: 13 }}>
            {b.start_date} → {b.end_date} ({b.reason || 'Blocked'})
            <button
              style={{ marginLeft: 10 }}
              onClick={() => deleteBlockedRange(b.id)}
            >
              Delete
            </button>
          </div>
        ))}

        <h3 style={{ marginTop: 20 }}>Approved Bookings</h3>
        {bookings.map((br: any) => (
          <div key={br.id} style={{ marginTop: 6, fontSize: 13 }}>
            {br.start_date} → {br.end_date}
          </div>
        ))}
      </div>
    </div>
  );
}
