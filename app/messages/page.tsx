"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Thread = {
  request_id: string;
  created_at: string;
  content: string;
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString();
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [unreadByRequest, setUnreadByRequest] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState<any>(null);

  const totalUnread = useMemo(
    () => Object.values(unreadByRequest).reduce((a, b) => a + b, 0),
    [unreadByRequest]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        setDebug({ step: "auth", authErr });
        setLoading(false);
        return;
      }
      const userId = authData.user.id;

      const { data: borrowerReqs, error: borrowerReqErr } = await supabase
        .from("borrow_requests")
        .select("id")
        .eq("borrower_id", userId);

      if (borrowerReqErr) {
        setDebug({ step: "borrower_requests", borrowerReqErr });
        setLoading(false);
        return;
      }

      const { data: myHorses, error: horsesErr } = await supabase
        .from("horses")
        .select("id")
        .eq("owner_id", userId);

      if (horsesErr) {
        setDebug({ step: "my_horses", horsesErr });
        setLoading(false);
        return;
      }

      const myHorseIds = (myHorses ?? []).map((h: any) => h.id);

      let ownerReqs: any[] = [];
      if (myHorseIds.length > 0) {
        const { data, error: ownerReqErr } = await supabase
          .from("borrow_requests")
          .select("id")
          .in("horse_id", myHorseIds);

        if (ownerReqErr) {
          setDebug({ step: "owner_requests", ownerReqErr });
          setLoading(false);
          return;
        }
        ownerReqs = data ?? [];
      }

      const requestIdSet = new Set<string>();
      (borrowerReqs ?? []).forEach((r: any) => requestIdSet.add(r.id));
      (ownerReqs ?? []).forEach((r: any) => requestIdSet.add(r.id));
      const requestIds = Array.from(requestIdSet);

      if (requestIds.length === 0) {
        setThreads([]);
        setUnreadByRequest({});
        setDebug({ step: "no_requests" });
        setLoading(false);
        return;
      }

      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("request_id, created_at, content")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false });

      if (msgErr) {
        setDebug({ step: "latest_messages", msgErr });
        setLoading(false);
        return;
      }

      const latestMap = new Map<string, Thread>();
      (msgs ?? []).forEach((m: any) => {
        if (!latestMap.has(m.request_id)) latestMap.set(m.request_id, m);
      });

      const latestThreads = Array.from(latestMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const { data: unreadMsgs, error: unreadErr } = await supabase
        .from("messages")
        .select("request_id")
        .in("request_id", requestIds)
        .is("read_at", null)
        .neq("sender_id", userId);

      if (unreadErr) {
        setDebug({ step: "unread_messages", unreadErr });
        setLoading(false);
        return;
      }

      const counts: Record<string, number> = {};
      (unreadMsgs ?? []).forEach((m: any) => {
        counts[m.request_id] = (counts[m.request_id] ?? 0) + 1;
      });

      setThreads(latestThreads);
      setUnreadByRequest(counts);
      setDebug({ step: "done", requestIdsCount: requestIds.length, threadsCount: latestThreads.length });
      setLoading(false);
    };

    load();
  }, []);

  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(1200px 600px at 20% -10%, rgba(255,105,180,0.18), transparent 60%), radial-gradient(900px 500px at 95% 10%, rgba(99,102,241,0.16), transparent 55%), linear-gradient(180deg, #fbfbff, #ffffff)",
      padding: 28,
    } as React.CSSProperties,
    shell: {
      maxWidth: 980,
      margin: "0 auto",
    } as React.CSSProperties,
    headerRow: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 18,
    } as React.CSSProperties,
    title: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 } as React.CSSProperties,
    subtitle: { margin: "6px 0 0", color: "#4b5563", fontSize: 14 } as React.CSSProperties,
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.75)",
      boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
      fontSize: 13,
      color: "#111827",
      fontWeight: 650,
      whiteSpace: "nowrap",
    } as React.CSSProperties,
    list: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
    } as React.CSSProperties,
    card: {
      background: "rgba(255,255,255,0.88)",
      border: "1px solid rgba(15,23,42,0.10)",
      boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
      borderRadius: 16,
      padding: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    } as React.CSSProperties,
    left: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 } as React.CSSProperties,
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 14,
      background:
        "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(236,72,153,0.92))",
      boxShadow: "0 10px 22px rgba(99,102,241,0.18)",
      flex: "0 0 auto",
    } as React.CSSProperties,
    textBlock: { minWidth: 0 } as React.CSSProperties,
    topLine: { display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
    requestMono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12, color: "#6b7280" } as React.CSSProperties,
    preview: {
      marginTop: 4,
      fontSize: 15,
      color: "#111827",
      fontWeight: 650,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: 640,
    } as React.CSSProperties,
    meta: { marginTop: 4, fontSize: 12, color: "#6b7280" } as React.CSSProperties,
    right: { display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
    badge: {
      background: "linear-gradient(135deg, #ef4444, #f43f5e)",
      color: "white",
      fontWeight: 800,
      fontSize: 12,
      padding: "6px 10px",
      borderRadius: 999,
      minWidth: 28,
      textAlign: "center" as const,
      boxShadow: "0 10px 20px rgba(239,68,68,0.22)",
    } as React.CSSProperties,
    link: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.75)",
      textDecoration: "none",
      color: "#111827",
      fontWeight: 700,
      fontSize: 13,
      whiteSpace: "nowrap",
    } as React.CSSProperties,
    skeleton: {
      height: 68,
      borderRadius: 16,
      border: "1px solid rgba(15,23,42,0.10)",
      background:
        "linear-gradient(90deg, rgba(15,23,42,0.04), rgba(15,23,42,0.08), rgba(15,23,42,0.04))",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.2s infinite",
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div style={styles.shell}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Messages</h1>
            <p style={styles.subtitle}>Your conversations with borrowers and owners.</p>
          </div>

          <div style={styles.pill}>
            <span style={{ opacity: 0.7 }}>Unread</span>
            <span style={{ fontWeight: 900 }}>{totalUnread}</span>
          </div>
        </div>

        {/* Debug (keep for now; remove later) */}
        <pre
          style={{
            background: "rgba(17,24,39,0.92)",
            color: "#86efac",
            padding: 14,
            borderRadius: 14,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 12,
            marginBottom: 16,
            whiteSpace: "pre-wrap",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
          }}
        >
          {JSON.stringify(debug, null, 2)}
        </pre>

        {loading ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={styles.skeleton} />
            <div style={styles.skeleton} />
            <div style={styles.skeleton} />
          </div>
        ) : threads.length === 0 ? (
          <div
            style={{
              borderRadius: 16,
              border: "1px dashed rgba(15,23,42,0.18)",
              padding: 22,
              color: "#374151",
              background: "rgba(255,255,255,0.7)",
            }}
          >
            No conversations yet.
          </div>
        ) : (
          <div style={styles.list}>
            {threads.map((t) => {
              const unread = unreadByRequest[t.request_id] ?? 0;
              return (
                <div key={t.request_id} style={styles.card}>
                  <div style={styles.left}>
                    <div style={styles.avatar} />
                    <div style={styles.textBlock}>
                      <div style={styles.topLine}>
                        <span style={styles.requestMono}>{t.request_id}</span>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>•</span>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{timeAgo(t.created_at)} ago</span>
                      </div>
                      <div style={styles.preview}>{t.content}</div>
                      <div style={styles.meta}>Tap to open the chat</div>
                    </div>
                  </div>

                  <div style={styles.right}>
                    {unread > 0 && <div style={styles.badge}>{unread}</div>}
                    <Link href={`/messages/${t.request_id}`} style={styles.link}>
                      Open →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
