"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Counts = {
  unreadMessages: number;
  pendingRequests: number;
};

function BellIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22a2.25 2.25 0 0 0 2.2-1.8h-4.4A2.25 2.25 0 0 0 12 22Z" fill="currentColor" />
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useOutsideClick<T extends HTMLElement>(ref: React.RefObject<T | null>, onOutside: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onOutside();
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [ref, onOutside]);
}

export default function NotificationBell() {
  const [counts, setCounts] = useState<Counts>({ unreadMessages: 0, pendingRequests: 0 });
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  useOutsideClick(rootRef, () => setOpen(false));

  const total = useMemo(() => counts.unreadMessages + counts.pendingRequests, [counts]);

  async function refreshCounts() {
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const uid = !userErr ? userRes.user?.id ?? null : null;

      if (!uid) {
        setCounts({ unreadMessages: 0, pendingRequests: 0 });
        setReady(true);
        return;
      }

      const unreadPromise = supabase
        .from("message_threads")
        .select("request_id, unread_count")
        .gt("unread_count", 0);

      const horsesPromise = supabase.from("horses").select("id").eq("owner_id", uid);

      const [unreadRes, horsesRes] = await Promise.all([unreadPromise, horsesPromise]);

      let unreadMessages = 0;
      if (!unreadRes.error) {
        unreadMessages = ((unreadRes.data ?? []) as Array<{ unread_count: number }>).reduce(
          (sum, row) => sum + Number(row.unread_count ?? 0),
          0
        );
      }

      let pendingRequests = 0;
      if (!horsesRes.error) {
        const horseIds = (horsesRes.data ?? []).map((r: any) => r.id).filter(Boolean);

        if (horseIds.length > 0) {
          const { count, error } = await supabase
            .from("borrow_requests")
            .select("id", { count: "exact", head: true })
            .in("horse_id", horseIds)
            .eq("status", "pending");

          if (!error) pendingRequests = count ?? 0;
        }
      }

      setCounts({ unreadMessages, pendingRequests });
      setReady(true);
    } catch {
      setReady(true);
    }
  }

  useEffect(() => {
    let mounted = true;

    refreshCounts();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (!mounted) return;
      refreshCounts();
    });

    const msgCh = supabase
      .channel("rt:messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => mounted && refreshCounts())
      .subscribe();

    const reqCh = supabase
      .channel("rt:borrow_requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "borrow_requests" }, () => mounted && refreshCounts())
      .subscribe();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      supabase.removeChannel(msgCh);
      supabase.removeChannel(reqCh);
    };
  }, []);

  if (!ready) return null;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        style={{
          position: "relative",
          width: 44,
          height: 44,
          borderRadius: 14,
          border: "1px solid rgba(15,23,42,0.12)",
          background: "white",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          color: "#0f172a",
        }}
      >
        <BellIcon size={18} />

        {total > 0 ? (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              transform: "translate(40%,-40%)",
              minWidth: 18,
              height: 18,
              padding: "0 6px",
              borderRadius: 999,
              background: "black",
              color: "white",
              fontSize: 11,
              fontWeight: 900,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              pointerEvents: "none",
              boxShadow: "0 6px 18px rgba(0,0,0,0.20)",
            }}
          >
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 50,
            width: 280,
            borderRadius: 14,
            border: "1px solid rgba(15,23,42,0.12)",
            background: "white",
            boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
            padding: 12,
            zIndex: 50,
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 8 }}>Notifications</div>

          <div style={{ display: "grid", gap: 8 }}>
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              style={{
                textDecoration: "none",
                color: "#0f172a",
                border: "1px solid rgba(15,23,42,0.10)",
                borderRadius: 12,
                padding: 10,
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 850,
              }}
            >
              <span>Unread messages</span>
              <span>{counts.unreadMessages}</span>
            </Link>

            <Link
              href="/dashboard/owner/requests"
              onClick={() => setOpen(false)}
              style={{
                textDecoration: "none",
                color: "#0f172a",
                border: "1px solid rgba(15,23,42,0.10)",
                borderRadius: 12,
                padding: 10,
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 850,
              }}
            >
              <span>Pending requests</span>
              <span>{counts.pendingRequests}</span>
            </Link>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>Updates live when messages or requests change.</div>
        </div>
      ) : null}
    </div>
  );
}