'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Counts = {
  unreadMessages: number;
  pendingRequests: number;
};

function BellIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useOutsideClick(ref: RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onOutside();
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [ref, onOutside]);
}

export default function NotificationBell() {
  const [counts, setCounts] = useState<Counts>({ unreadMessages: 0, pendingRequests: 0 });
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  useOutsideClick(rootRef as unknown as RefObject<HTMLElement>, () => setOpen(false));

  const total = useMemo(() => counts.unreadMessages + counts.pendingRequests, [counts]);

  async function refreshCounts() {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;

      if (!uid) {
        setCounts({ unreadMessages: 0, pendingRequests: 0 });
        setReady(true);
        return;
      }

      // Unread messages = read_at null and not sent by me
      const unreadQ = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .neq('sender_id', uid);

      // Pending requests for horses I own (inner join)
      const pendingQ = supabase
        .from('borrow_requests')
        .select('id, horses!inner(owner_id)', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('horses.owner_id', uid);

      const [unreadRes, pendingRes] = await Promise.all([unreadQ, pendingQ]);

      setCounts({
        unreadMessages: unreadRes.count ?? 0,
        pendingRequests: pendingRes.count ?? 0,
      });

      setReady(true);
    } catch {
      // Never break header
      setReady(true);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      await refreshCounts();
      if (!alive) return;
    })();

    // Realtime (safe, rely on RLS; just refresh)
    const channel = supabase
      .channel('header-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => refreshCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrow_requests' }, () => refreshCounts())
      .subscribe();

    // light polling as backup
    const t = window.setInterval(() => refreshCounts(), 20000);

    return () => {
      alive = false;
      window.clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, []);

  if (!ready) return null;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.12)',
          background: 'white',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <BellIcon />
        {total > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: 7,
              right: 7,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              background: 'black',
              color: 'white',
              fontSize: 11,
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '18px',
            }}
          >
            {total > 99 ? '99+' : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 46,
            width: 280,
            borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'white',
            boxShadow: '0 18px 50px rgba(0,0,0,0.10)',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          <div style={{ padding: 12, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 950, fontSize: 13 }}>Notifications</div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(0,0,0,0.60)' }}>
              Messages + booking requests
            </div>
          </div>

          <div style={{ padding: 10, display: 'grid', gap: 8 }}>
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              style={{
                textDecoration: 'none',
                color: 'black',
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 12,
                padding: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Messages</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.60)' }}>Unread messages</div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: counts.unreadMessages ? 'black' : 'rgba(0,0,0,0.06)',
                  color: counts.unreadMessages ? 'white' : 'rgba(0,0,0,0.60)',
                  minWidth: 40,
                  textAlign: 'center',
                }}
              >
                {counts.unreadMessages}
              </div>
            </Link>

            <Link
              href="/dashboard/owner/requests"
              onClick={() => setOpen(false)}
              style={{
                textDecoration: 'none',
                color: 'black',
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 12,
                padding: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Booking Requests</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.60)' }}>Pending approvals</div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: counts.pendingRequests ? 'black' : 'rgba(0,0,0,0.06)',
                  color: counts.pendingRequests ? 'white' : 'rgba(0,0,0,0.60)',
                  minWidth: 40,
                  textAlign: 'center',
                }}
              >
                {counts.pendingRequests}
              </div>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
