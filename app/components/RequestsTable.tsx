'use client';

import Link from 'next/link';
import { useMemo } from 'react';

export type RequestRow = {
  id: string;
  horse_id: string;
  borrower_id: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  start_date: string | null;
  end_date: string | null;
  message?: string | null;

  // optional joins / computed fields your app may pass
  horse?: { id?: string; name?: string | null } | null;
  borrower?: { id?: string; display_name?: string | null; full_name?: string | null } | null;
  horse_name?: string | null;
  borrower_name?: string | null;
  horseId?: string | null;
  horseName?: string | null;
  request_id?: string | null;
  requestId?: string | null;

  // allow extra props safely
  [key: string]: any;
};

type Props = any;

function pillStyle(kind: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.10)',
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: 'nowrap',
  };

  if (kind === 'approved') return { ...base, background: 'rgba(0,160,60,0.10)', color: 'rgba(0,120,45,0.95)' };
  if (kind === 'rejected') return { ...base, background: 'rgba(220,0,0,0.08)', color: 'rgba(170,0,0,0.95)' };
  if (kind === 'pending') return { ...base, background: 'rgba(255,180,0,0.14)', color: 'rgba(125,80,0,0.95)' };
  return { ...base, background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.70)' };
}

function btnStyle(kind: 'primary' | 'secondary' | 'danger'): React.CSSProperties {
  const common: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.14)',
    borderRadius: 12,
    padding: '9px 10px',
    fontSize: 13,
    fontWeight: 950,
    background: 'white',
    color: 'black',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
  };

  if (kind === 'primary') return { ...common, background: 'black', color: 'white' };
  if (kind === 'danger') return { ...common, border: '1px solid rgba(200,0,0,0.25)', color: 'rgba(170,0,0,0.95)' };
  return common;
}

function thStyle(): React.CSSProperties {
  return {
    textAlign: 'left',
    padding: '12px 14px',
    fontSize: 12,
    fontWeight: 950,
    color: 'rgba(0,0,0,0.60)',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    background: 'rgba(0,0,0,0.02)',
    whiteSpace: 'nowrap',
  };
}

function tdStyle(): React.CSSProperties {
  return {
    padding: '12px 14px',
    fontSize: 13,
    verticalAlign: 'top',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  };
}

function fmtDate(d: any) {
  if (!d) return '—';
  try {
    return String(d).slice(0, 10);
  } catch {
    return String(d);
  }
}

function getHorseId(r: any): string | null {
  return r?.horse_id ?? r?.horseId ?? r?.horse?.id ?? null;
}

function getHorseName(r: any): string {
  return r?.horse_name ?? r?.horse?.name ?? r?.horseName ?? 'Horse';
}

function getBorrowerLabel(r: any): string {
  return r?.borrower_name ?? r?.borrower?.display_name ?? r?.borrower?.full_name ?? r?.borrowerName ?? 'Borrower';
}

function RequestsTableImpl(props: Props) {
  const requests: any[] = (props?.requests ?? props?.rows ?? props?.data ?? []) as any[];

  const onApprove = props?.onApprove ?? props?.onApproveRequest ?? props?.approveRequest ?? null;
  const onReject = props?.onReject ?? props?.onRejectRequest ?? props?.rejectRequest ?? null;
  const onDelete = props?.onDelete ?? props?.onDeleteRequest ?? props?.deleteRequest ?? null;

  const title: string = props?.title ?? 'Requests';
  const subtitle: string | null = props?.subtitle ?? null;
  const emptyLabel: string = props?.emptyLabel ?? 'No requests.';

  const rows = useMemo(() => requests ?? [], [requests]);

  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.10)',
        borderRadius: 14,
        background: 'white',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 14, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ fontWeight: 950, fontSize: 14 }}>{title}</div>
        {subtitle ? (
          <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>{subtitle}</div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 14, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>{emptyLabel}</div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 900 }}>
            <thead>
              <tr>
                <th style={thStyle()}>Horse</th>
                <th style={thStyle()}>Borrower</th>
                <th style={thStyle()}>Dates</th>
                <th style={thStyle()}>Status</th>
                <th style={{ ...thStyle(), textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const status = String(r?.status ?? 'pending');
                const horseId = getHorseId(r);
                const requestId = r?.id ?? r?.request_id ?? r?.requestId ?? null;

                const requestHref = requestId ? `/dashboard/owner/${requestId}` : null;
                const availabilityHref = horseId ? `/dashboard/owner/horses/${horseId}/availability` : null;

                const canApprove = typeof onApprove === 'function' && status === 'pending';
                const canReject = typeof onReject === 'function' && status === 'pending';
                const canDelete = typeof onDelete === 'function';

                return (
                  <tr key={String(requestId ?? `${horseId}-${Math.random()}`)}>
                    <td style={tdStyle()}>
                      <div style={{ fontWeight: 950, fontSize: 13 }}>{getHorseName(r)}</div>
                      {horseId ? (
                        <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{horseId}</div>
                      ) : null}
                    </td>

                    <td style={tdStyle()}>
                      <div style={{ fontWeight: 850, fontSize: 13 }}>{getBorrowerLabel(r)}</div>
                      {r?.message ? (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.65)', maxWidth: 380 }}>
                          {String(r.message).slice(0, 120)}
                          {String(r.message).length > 120 ? '…' : ''}
                        </div>
                      ) : null}
                    </td>

                    <td style={tdStyle()}>
                      <div style={{ fontSize: 13, fontWeight: 900 }}>
                        {fmtDate(r?.start_date)} → {fmtDate(r?.end_date)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>End date inclusive</div>
                    </td>

                    <td style={tdStyle()}>
                      <span style={pillStyle(status)}>{status.toUpperCase()}</span>
                    </td>

                    <td style={{ ...tdStyle(), textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {availabilityHref ? (
                          <Link href={availabilityHref} style={btnStyle('secondary')}>
                            Availability
                          </Link>
                        ) : null}

                        {requestHref ? (
                          <Link href={requestHref} style={btnStyle('secondary')}>
                            View
                          </Link>
                        ) : null}

                        {canApprove ? (
                          <button onClick={() => onApprove(r)} style={btnStyle('primary')}>
                            Approve
                          </button>
                        ) : null}

                        {canReject ? (
                          <button onClick={() => onReject(r)} style={btnStyle('secondary')}>
                            Reject
                          </button>
                        ) : null}

                        {canDelete ? (
                          <button onClick={() => onDelete(r)} style={btnStyle('danger')}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RequestsTableImpl;
export const RequestsTable = RequestsTableImpl;
