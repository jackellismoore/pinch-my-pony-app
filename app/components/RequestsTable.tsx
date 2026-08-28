'use client';

import Link from 'next/link';
import { useMemo } from 'react';

export type RequestRow = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'accepted' | string;
  start_date: string | null;
  end_date: string | null;
  message?: string | null;
  horse_id?: string | null;
  borrower_id?: string | null;
  horseId?: string | null;
  borrowerId?: string | null;
  horse?: { id?: string; name?: string | null } | null;
  borrower?: { id?: string; display_name?: string | null; full_name?: string | null } | null;
  horse_name?: string | null;
  borrower_name?: string | null;
  request_id?: string | null;
  requestId?: string | null;
  [key: string]: any;
};

type Props = {
  rows?: any[];
  requests?: any[];
  data?: any[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  emptyLabel?: string;
  onApprove?: (row: any) => void;
  onReject?: (row: any) => void;
  onDelete?: (row: any) => void;
  onApproveRequest?: (row: any) => void;
  onRejectRequest?: (row: any) => void;
  onDeleteRequest?: (row: any) => void;
  approveRequest?: (row: any) => void;
  rejectRequest?: (row: any) => void;
  deleteRequest?: (row: any) => void;
  mode?: 'owner' | 'borrower';
  showReviewCTA?: boolean;
  canReviewByRequestId?: Record<string, boolean>;
};

function pillStyle(kind: string): React.CSSProperties {
  const base: React.CSSProperties = { display:'inline-flex',alignItems:'center',padding:'6px 10px',borderRadius:999,border:'1px solid rgba(0,0,0,.10)',fontSize:12,fontWeight:950,whiteSpace:'nowrap' };
  if (kind === 'approved' || kind === 'accepted') return { ...base, background:'rgba(0,160,60,.10)', color:'rgba(0,120,45,.95)' };
  if (kind === 'rejected') return { ...base, background:'rgba(220,0,0,.08)', color:'rgba(170,0,0,.95)' };
  if (kind === 'pending') return { ...base, background:'rgba(255,180,0,.14)', color:'rgba(125,80,0,.95)' };
  return { ...base, background:'rgba(0,0,0,.04)', color:'rgba(0,0,0,.70)' };
}

function btnStyle(kind: 'primary' | 'secondary' | 'danger'): React.CSSProperties {
  const common: React.CSSProperties = { border:'1px solid rgba(0,0,0,.14)',borderRadius:12,padding:'9px 10px',fontSize:13,fontWeight:950,background:'white',color:'black',cursor:'pointer',textDecoration:'none',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,whiteSpace:'nowrap' };
  if (kind === 'primary') return { ...common, background:'#173d2c', color:'white', borderColor:'#173d2c' };
  if (kind === 'danger') return { ...common, border:'1px solid rgba(200,0,0,.25)', color:'rgba(170,0,0,.95)' };
  return common;
}

function fmtDate(d: any) {
  if (!d) return '—';
  const raw = String(d).slice(0,10);
  try { return new Date(`${raw}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); } catch { return raw; }
}

function getHorseId(r:any):string|null { return r?.horse_id ?? r?.horseId ?? r?.horse?.id ?? null; }
function getHorseName(r:any):string { return r?.horse_name ?? r?.horse?.name ?? r?.horseName ?? 'Horse'; }
function getBorrowerLabel(r:any):string { return r?.borrower_name ?? r?.borrower?.display_name ?? r?.borrower?.full_name ?? r?.borrowerName ?? 'Borrower'; }
function getRequestId(r:any):string|null { return r?.id ?? r?.request_id ?? r?.requestId ?? null; }

export default function RequestsTableImpl(props: Props) {
  const requests:any[] = (props.requests ?? props.rows ?? props.data ?? []) as any[];
  const rows = useMemo(() => requests ?? [], [requests]);
  const onApprove = props.onApprove ?? props.onApproveRequest ?? props.approveRequest ?? null;
  const onReject = props.onReject ?? props.onRejectRequest ?? props.rejectRequest ?? null;
  const onDelete = props.onDelete ?? props.onDeleteRequest ?? props.deleteRequest ?? null;
  const title = props.title ?? 'Requests';
  const subtitle = props.subtitle ?? null;
  const emptyLabel = props.emptyLabel ?? 'No requests.';
  const mode = props.mode ?? 'owner';
  const showReviewCTA = Boolean(props.showReviewCTA);
  const canReviewByRequestId = props.canReviewByRequestId ?? {};

  return (
    <div className="pmp-requestsWrap">
      <style>{`
        .pmp-requestsWrap{border:1px solid rgba(31,42,68,.10);border-radius:18px;background:white;overflow:hidden;max-width:100%}
        .pmp-requestsHead{padding:16px;border-bottom:1px solid rgba(31,42,68,.08)}
        .pmp-requestsTitle{font-weight:950;font-size:16px;color:#1f2a44}.pmp-requestsSub{margin-top:6px;font-size:13px;line-height:1.45;color:rgba(31,42,68,.68)}
        .pmp-requestList{display:grid;gap:12px;padding:12px}.pmp-requestCard{border:1px solid rgba(31,42,68,.10);border-radius:16px;padding:14px;background:#fff;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px}
        .pmp-requestHorse{font-size:16px;font-weight:950;color:#1f2a44}.pmp-requestMeta{margin-top:8px;display:grid;gap:6px;font-size:13px;color:rgba(31,42,68,.72);line-height:1.4}.pmp-requestMeta strong{color:#1f2a44}
        .pmp-requestActions{display:flex;gap:8px;flex-wrap:wrap;align-content:flex-start;justify-content:flex-end;max-width:280px}.pmp-requestMessage{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(31,42,68,.04);font-size:13px;line-height:1.45;color:rgba(31,42,68,.74);overflow-wrap:anywhere}
        @media(max-width:640px){.pmp-requestCard{grid-template-columns:1fr}.pmp-requestActions{max-width:none;width:100%;display:grid;grid-template-columns:1fr}.pmp-requestActions>a,.pmp-requestActions>button{width:100%!important;box-sizing:border-box}.pmp-requestList{padding:10px}.pmp-requestCard{padding:13px}.pmp-requestsHead{padding:14px}}
      `}</style>
      <div className="pmp-requestsHead"><div className="pmp-requestsTitle">{title}</div>{subtitle ? <div className="pmp-requestsSub">{subtitle}</div> : null}</div>
      {rows.length === 0 ? <div style={{padding:16,fontSize:13,color:'rgba(31,42,68,.65)'}}>{emptyLabel}</div> : (
        <div className="pmp-requestList">
          {rows.map((r) => {
            const status = String(r?.status ?? 'pending');
            const horseId = getHorseId(r);
            const requestId = getRequestId(r);
            const availabilityHref = horseId ? `/dashboard/owner/horses/${horseId}/availability` : null;
            const requestHref = requestId ? `/dashboard/owner/${requestId}` : null;
            const eligibleForReview = showReviewCTA && requestId && (status === 'accepted' || status === 'approved') && Boolean(canReviewByRequestId[String(requestId)]);
            const canApprove = typeof onApprove === 'function' && status === 'pending';
            const canReject = typeof onReject === 'function' && status === 'pending';
            const canDelete = typeof onDelete === 'function';
            return (
              <article className="pmp-requestCard" key={String(requestId ?? horseId ?? Math.random())}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}><div className="pmp-requestHorse">{getHorseName(r)}</div><span style={pillStyle(status)}>{status.toUpperCase()}</span></div>
                  <div className="pmp-requestMeta">
                    <div><strong>{mode === 'borrower' ? 'Owner' : 'Requester'}:</strong> {getBorrowerLabel(r)}</div>
                    <div><strong>Dates:</strong> {fmtDate(r?.start_date)} → {fmtDate(r?.end_date)}</div>
                  </div>
                  {r?.message ? <div className="pmp-requestMessage">{String(r.message)}</div> : null}
                </div>
                <div className="pmp-requestActions">
                  {eligibleForReview ? <Link href={`/review/${requestId}`} style={btnStyle('primary')}>Leave a review →</Link> : null}
                  {availabilityHref && mode !== 'borrower' ? <Link href={availabilityHref} style={btnStyle('secondary')}>Availability</Link> : null}
                  {requestHref && mode !== 'borrower' ? <Link href={requestHref} style={btnStyle('secondary')}>View request</Link> : null}
                  {requestId ? <Link href={`/messages/${requestId}`} style={btnStyle('secondary')}>Messages</Link> : null}
                  {canApprove ? <button onClick={() => onApprove(r)} style={btnStyle('primary')}>Approve</button> : null}
                  {canReject ? <button onClick={() => onReject(r)} style={btnStyle('secondary')}>Reject</button> : null}
                  {canDelete ? <button onClick={() => onDelete(r)} style={btnStyle('danger')}>Delete</button> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const RequestsTable = RequestsTableImpl;
