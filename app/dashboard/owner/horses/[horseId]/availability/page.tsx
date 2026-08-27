'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
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
  return startISO <= dateISO && dateISO <= endISO;
}

function formatDate(dateISO: string) {
  const d = new Date(`${dateISO}T12:00:00`);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function OwnerHorseAvailabilityPage() {
  const params = useParams();
  const horseId = String((params as any)?.horseId ?? '');

  const {
    blocked,
    bookings,
    error,
    addBlockedRange,
    deleteBlockedRange,
  } = useHorseAvailability(horseId);

  const today = toISODate(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

    for (let i = 0; i < leadingBlanks; i++) cells.push({ dateISO: null, day: null });
    for (let day = 1; day <= dim; day++) {
      cells.push({ dateISO: toISODate(new Date(year, month, day)), day });
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
      const isBlocked = blocked.some((b: any) => overlapsDate(dateISO, b.start_date, b.end_date));
      if (isBlocked) {
        kinds[dateISO] = 'blocked';
        continue;
      }
      const isBooked = bookings.some((br: any) => overlapsDate(dateISO, br.start_date, br.end_date));
      kinds[dateISO] = isBooked ? 'booking' : null;
    }

    return kinds;
  }, [monthCursor, blocked, bookings]);

  async function onAddBlock() {
    setLocalError(null);

    if (!startDate || !endDate) {
      setLocalError('Choose both a start and end date.');
      return;
    }
    if (startDate > endDate) {
      setLocalError('The end date must be on or after the start date.');
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
      setStartDate(today);
      setEndDate(today);
      setReason('');
    } catch (e: any) {
      setLocalError(e?.message ?? 'Failed to add blocked range.');
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteBlock(id: string) {
    try {
      setDeletingId(id);
      await deleteBlockedRange(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="pmp-availabilityPage">
      <style>{`
        .pmp-availabilityPage{width:100%;max-width:900px;margin:0 auto;padding:18px 16px 120px;box-sizing:border-box;color:#17213a;overflow-x:hidden}
        .pmp-availabilityCard{width:100%;max-width:100%;box-sizing:border-box;overflow:hidden;background:rgba(255,255,255,.96);border:1px solid rgba(23,33,58,.10);border-radius:22px;box-shadow:0 18px 44px rgba(23,33,58,.08);padding:18px}
        .pmp-availabilityTitle{margin:0;font-size:24px;line-height:1.1;font-weight:950;color:#17213a}
        .pmp-calendarHeader{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:10px;margin-top:22px;width:100%}
        .pmp-calendarNav{width:44px;height:40px;border-radius:14px;border:1px solid rgba(23,33,58,.12);background:white;font-size:22px;line-height:1;color:#2388e8;display:grid;place-items:center;padding:0}
        .pmp-calendarMonth{text-align:center;font-size:18px;font-weight:950;color:#17213a;min-width:0}
        .pmp-calendarGrid{width:100%;margin-top:14px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}
        .pmp-weekday{text-align:center;font-size:12px;font-weight:900;color:#17213a;padding-bottom:2px;min-width:0}
        .pmp-day{width:100%;aspect-ratio:1/1;border:1px solid rgba(23,33,58,.10);border-radius:10px;background:white;font-size:14px;color:#17213a;display:grid;place-items:center;min-width:0;box-sizing:border-box}
        .pmp-dayBlocked{background:#fff4d7;border-color:#e8c979}
        .pmp-dayBooked{background:#e7f3ff;border-color:#9bc9f1}
        .pmp-section{margin-top:28px;min-width:0}
        .pmp-sectionTitle{margin:0 0 12px;font-size:19px;font-weight:950;color:#17213a}
        .pmp-blockForm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;min-width:0}
        .pmp-field{display:grid;gap:6px;min-width:0;width:100%;overflow:hidden}
        .pmp-fieldFull{grid-column:1/-1}
        .pmp-field label{font-size:12px;font-weight:900;color:rgba(23,33,58,.68)}
        .pmp-input{display:block;width:100%;max-width:100%;min-width:0;min-inline-size:0;box-sizing:border-box;min-height:46px;border-radius:14px;border:1px solid rgba(23,33,58,.12);background:#fff;padding:0 12px;font:inherit;font-size:16px;color:#17213a;outline:none}
        .pmp-input[type='date']{-webkit-appearance:none;appearance:none;text-align:center}
        .pmp-input:focus{border-color:#7aa98e;box-shadow:0 0 0 3px rgba(65,117,88,.10)}
        .pmp-addButton{grid-column:1/-1;width:100%;max-width:100%;box-sizing:border-box;min-height:48px;border:0;border-radius:14px;background:#173d2c;color:#fff;font-size:15px;font-weight:950;padding:0 18px}
        .pmp-addButton:disabled{opacity:.55}
        .pmp-inlineError{margin-top:10px;border-radius:12px;background:#fff1f1;color:#a33;padding:10px 12px;font-size:13px;font-weight:750}
        .pmp-rangeList{display:grid;gap:10px;min-width:0}
        .pmp-rangeCard{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(23,33,58,.10);border-radius:16px;background:#fff;padding:13px 14px;min-width:0}
        .pmp-rangeMain{min-width:0}
        .pmp-rangeDates{font-size:14px;font-weight:950;color:#17213a;line-height:1.35;overflow-wrap:anywhere}
        .pmp-rangeReason{margin-top:3px;font-size:13px;color:rgba(23,33,58,.68);line-height:1.35;overflow-wrap:anywhere}
        .pmp-deleteButton{flex:0 0 auto;border:1px solid rgba(176,49,49,.18);border-radius:12px;background:#fff5f5;color:#a52d2d;font-size:13px;font-weight:900;padding:9px 11px}
        .pmp-emptyState{border:1px dashed rgba(23,33,58,.16);border-radius:16px;padding:15px;color:rgba(23,33,58,.62);font-size:14px;background:rgba(248,249,247,.7);box-sizing:border-box;max-width:100%}
        .pmp-bookingCard{border:1px solid #c7e1f7;background:#f4faff;border-radius:16px;padding:13px 14px;box-sizing:border-box;max-width:100%}
        .pmp-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;font-size:12px;font-weight:800;color:rgba(23,33,58,.65)}
        .pmp-legendItem{display:flex;align-items:center;gap:6px}.pmp-dot{width:10px;height:10px;border-radius:999px;display:inline-block}.pmp-dotBlocked{background:#e8c979}.pmp-dotBooked{background:#9bc9f1}
        @media(max-width:520px){
          .pmp-availabilityPage{padding:10px 8px 118px}
          .pmp-availabilityCard{padding:14px 12px;border-radius:18px}
          .pmp-availabilityTitle{font-size:21px}
          .pmp-calendarHeader{grid-template-columns:40px minmax(0,1fr) 40px;gap:8px}
          .pmp-calendarNav{width:40px;height:38px;border-radius:12px}
          .pmp-calendarMonth{font-size:17px}
          .pmp-calendarGrid{gap:4px}
          .pmp-weekday{font-size:11px}
          .pmp-day{font-size:13px;border-radius:8px}
          .pmp-section{margin-top:24px}
          .pmp-blockForm{grid-template-columns:1fr;gap:12px}
          .pmp-fieldFull,.pmp-addButton{grid-column:auto}
          .pmp-rangeCard{align-items:flex-start;flex-direction:column}
          .pmp-deleteButton{width:100%}
          .pmp-rangeDates{font-size:13px}
        }
      `}</style>

      <div className="pmp-availabilityCard">
        <h1 className="pmp-availabilityTitle">Availability</h1>

        {error ? <div className="pmp-inlineError">{error}</div> : null}

        <div className="pmp-calendarHeader">
          <button className="pmp-calendarNav" onClick={() => setMonthCursor(addMonths(monthCursor, -1))} aria-label="Previous month">←</button>
          <div className="pmp-calendarMonth">{monthLabel}</div>
          <button className="pmp-calendarNav" onClick={() => setMonthCursor(addMonths(monthCursor, 1))} aria-label="Next month">→</button>
        </div>

        <div className="pmp-calendarGrid">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d} className="pmp-weekday">{d}</div>)}
          {calendarCells.map((cell, idx) => {
            if (!cell.dateISO) return <div key={idx} />;
            const kind = dayKindByISO[cell.dateISO];
            return (
              <div key={idx} className={`pmp-day ${kind === 'blocked' ? 'pmp-dayBlocked' : kind === 'booking' ? 'pmp-dayBooked' : ''}`}>
                {cell.day}
              </div>
            );
          })}
        </div>

        <div className="pmp-legend">
          <span className="pmp-legendItem"><span className="pmp-dot pmp-dotBlocked" />Blocked</span>
          <span className="pmp-legendItem"><span className="pmp-dot pmp-dotBooked" />Approved booking</span>
        </div>

        <section className="pmp-section">
          <h2 className="pmp-sectionTitle">Add blocked range</h2>
          <div className="pmp-blockForm">
            <div className="pmp-field">
              <label htmlFor="availability-start">From</label>
              <input id="availability-start" className="pmp-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="pmp-field">
              <label htmlFor="availability-end">To</label>
              <input id="availability-end" className="pmp-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="pmp-field pmp-fieldFull">
              <label htmlFor="availability-reason">Reason <span style={{fontWeight:700,opacity:.65}}>(optional)</span></label>
              <input id="availability-reason" className="pmp-input" placeholder="e.g. Away, vet appointment" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <button className="pmp-addButton" onClick={onAddBlock} disabled={saving}>{saving ? 'Saving…' : 'Add blocked dates'}</button>
          </div>
          {localError ? <div className="pmp-inlineError">{localError}</div> : null}
        </section>

        <section className="pmp-section">
          <h2 className="pmp-sectionTitle">Blocked ranges</h2>
          <div className="pmp-rangeList">
            {blocked.length === 0 ? <div className="pmp-emptyState">No blocked dates added yet.</div> : blocked.map((b: any) => (
              <div key={b.id} className="pmp-rangeCard">
                <div className="pmp-rangeMain">
                  <div className="pmp-rangeDates">{formatDate(b.start_date)} → {formatDate(b.end_date)}</div>
                  <div className="pmp-rangeReason">{b.reason || 'Blocked'}</div>
                </div>
                <button className="pmp-deleteButton" onClick={() => onDeleteBlock(b.id)} disabled={deletingId === b.id}>{deletingId === b.id ? 'Deleting…' : 'Delete'}</button>
              </div>
            ))}
          </div>
        </section>

        <section className="pmp-section">
          <h2 className="pmp-sectionTitle">Approved bookings</h2>
          <div className="pmp-rangeList">
            {bookings.length === 0 ? <div className="pmp-emptyState">No approved bookings yet.</div> : bookings.map((br: any) => (
              <div key={br.id} className="pmp-bookingCard">
                <div className="pmp-rangeDates">{formatDate(br.start_date)} → {formatDate(br.end_date)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
