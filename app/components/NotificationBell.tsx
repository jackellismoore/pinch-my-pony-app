'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Counts = {
  unreadMessages: number;
  pendingRequests: number;
};

function BellIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22a2.25 2.25 0 0 0 2.2-1.8h-4.4A2.25 2.25 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useOutsideClick(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
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
  useOutsideClick(rootRef, () => setOpen(false));

  const total = useMemo(() => counts.unreadMessages + counts.pendingRequests, [counts]);

  async function refreshCounts() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setCounts({ unreadMessages: 0, pendingRequests: 0 });
        setReady(true);
        return;
      }

      // 1) Get my horse ids (if I'm an owner)
      const { data: myHorses, error: horsesErr } = await supabase
        .from('horses')
        .select('id')
        .eq('owner_id', uid);

      if (horsesErr) throw horsesErr;

      const myHorseIds = (myHorses ?? []).map((h: any) => h.id).filter(Boolean);

      // 2) Pending requests on my horses
      let pendingRequests = 0;
      if (myHorseIds.length) {
        const { count, error } = await supabase
          .from('borrow_requests')
          .select('id', { count: 'exact', head: true })
          .in('horse_id', myHorseIds)
          .eq('status', 'pending');

        if (!error) pendingRequests = count ?? 0;
      }

      // 3) Figure out request IDs I'm part of (borrower OR owner of horse)
      //    a) borrower requests
      const { data: borrowerReqs, error: brErr } = await supabase
        .from('borrow_requests')
        .select('id')
        .eq('borrower_id', uid);

      if (brErr) throw brErr;

      //    b) owner requests
      let ownerReqs: any[] = [];
      if (myHorseIds.length) {
        const { data: or, error: orErr } = await supabase
          .from('borrow_requests')
          .select('id')
          .in('horse_id', myHorseIds);

        if (orErr) throw orErr;
        ownerReqs = or ?? [];
      }

      const requestIds = Array.from(
        new Set([...(borrowerReqs ?? []), ...ownerReqs].map((r: any) => r.id).filter(Boolean))
      );

      // 4) Unread messages in those threads (sender != me, read_at is null)
      let unreadMessages = 0;
      if (requestIds.length) {
        const { count, error } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('request_id', requestIds)
          .neq('sender_id', uid)
          .is('read_at', null);

        if (!error) unreadMessages = count ?? 0;
      }

      setCounts({ unreadMessages, pendingRequests });
      setReady(true);
    } catch {
      // Don't block UI
      setReady(true);
    }
  }

  // Initial + auth change refresh
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await refreshCounts();
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshCounts();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Realtime-ish: listen to inserts/updates on messages + borrow_requests and refresh
  useEffect(() => {
    let active = true;

    const ch = supabase
      .channel('notif:counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => active && refreshCounts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'borrow_requests' },
        () => active && refreshCounts()
      )
      .subscribe();

    // fallback poll every 20s (keeps it reliable if realtime disabled)
    const t = window.setInterval(() => refreshCounts(), 20000);

    return () => {
      active = false;
      window.clearInterval(t);
      supabase.removeChannel(ch);
    };
  }, []);

  if (!ready) return null;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.12)',
          background: 'white',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
        }}
        aria-label="Notifications"
      >
        <BellIcon />
        {total > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              minWidth: 18,
              height: 18,
              padding: '0 6px',
              borderRadius: 999,
              background: 'black',
              color: 'white',
              fontSize: 11,
              fontWeight: 900,
              display: 'grid',
              placeItems: 'center',
              lineHeight: 1,
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
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 14,
            background: 'white',
            boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          <div style={{ padding: 12, fontWeight: 900, fontSize: 13 }}>Notifications</div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 12,
                textDecoration: 'none',
                color: 'black',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>Messages</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {counts.unreadMessages > 0 ? `${counts.unreadMessages} unread` : 'No unread'}
              </div>
            </Link>

            <Link
              href="/dashboard/owner/requests"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 12,
                textDecoration: 'none',
                color: 'black',
                borderTop: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>Booking requests</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {counts.pendingRequests > 0 ? `${counts.pendingRequests} pending` : 'None pending'}
              </div>
            </Link>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: 10 }}>
            <button
              onClick={() => refreshCounts()}
              style={{
                width: '100%',
                border: '1px solid rgba(0,0,0,0.14)',
                background: 'white',
                borderRadius: 12,
                padding: '10px 12px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
