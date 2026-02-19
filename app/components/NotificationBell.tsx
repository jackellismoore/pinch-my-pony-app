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

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
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
      const { data: userRes } = await withTimeout(supabase.auth.getUser(), 2500, "getUser");
      const uid = userRes.user?.id;

      if (!uid) {
        setCounts({ unreadMessages: 0, pendingRequests: 0 });
        setReady(true);
        return;
      }

      const { data: myHorses, error: horsesErr } = await supabase.from("horses").select("id").eq("owner_id", uid);
      if (horsesErr) throw horsesErr;
      const myHorseIds = (myHorses ?? []).map((r: any) => r.id).filter(Boolean);

      const [borrowerReqs, ownerReqs] = await Promise.all([
        supabase.from("borrow_requests").select("id").eq("borrower_id", uid),
        myHorseIds.length
          ? supabase.from("borrow_requests").select("id").in("horse_id", myHorseIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (borrowerReqs.error) throw borrowerReqs.error;
      if (ownerReqs.error) throw ownerReqs.error;

      const requestIds = Array.from(
        new Set([...(borrowerReqs.data ?? []), ...(ownerReqs.data ?? [])].map((r: any) => r.id))
      );

      let unreadMessages = 0;
      if (requestIds.length) {
        const { count, error } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("request_id", requestIds)
          .neq("sender_id", uid)
          .is("read_at", null);

        if (error) throw error;
        unreadMessages = count ?? 0;
      }

      let pendingRequests = 0;
      if (myHorseIds.length) {
        const { count, error } = await supabase
          .from("borrow_requests")
          .select("id", { count: "exact", head: true })
          .in("horse_id", myHorseIds)
          .eq("status", "pending");

        if (error) throw error;
        pendingRequests = count ?? 0;
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
        <BellIcon />
        {total > 0 ? (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: 20,
              height: 20,
              padding: "0 7px",
              borderRadius: 999,
              background: "#0f172a",
              color: "white",
              fontSize: 11,
              fontWeight: 950,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              border: "2px solid white",
              boxShadow: "0 10px 25px rgba(15,23,42,0.18)",
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
            top: 52,
            width: 290,
            borderRadius: 16,
            border: "1px solid rgba(15,23,42,0.12)",
            background: "white",
            boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
            padding: 12,
            zIndex: 50,
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 8 }}>Notifications</div>

          <div style={{ display: "grid", gap: 8 }}>
            <Link href="/messages" onClick={() => setOpen(false)} style={pillLink()}>
              <span>Unread messages</span>
              <span>{counts.unreadMessages}</span>
            </Link>

            <Link href="/dashboard/owner/requests" onClick={() => setOpen(false)} style={pillLink()}>
              <span>Pending requests</span>
              <span>{counts.pendingRequests}</span>
            </Link>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>Updates live when messages/requests change.</div>
        </div>
      ) : null}
    </div>
  );
}

function pillLink(): React.CSSProperties {
  return {
    textDecoration: "none",
    color: "#0f172a",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    padding: 11,
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 900,
    background: "rgba(15,23,42,0.03)",
  };
}
