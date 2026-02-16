"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ThreadRow = {
  request_id: string;
  horse_name: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
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
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const totalUnread = useMemo(
    () => threads.reduce((sum, t) => sum + (t.unread_count ?? 0), 0),
    [threads]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("message_threads")
        .select(
          "request_id, horse_name, other_display_name, other_avatar_url, last_message, last_message_at, unread_count"
        )
        .order("last_message_at", { ascending: false });

      if (error) {
        setThreads([]);
        setLoading(false);
        return;
      }

      setThreads((data as ThreadRow[]) ?? []);
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
    shell: { maxWidth: 980, margin: "0 auto" } as React.CSSProperties,
    headerRow: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 18,
    } as React.CSSProperties,
    title: { fontSize: 28, fontWeight: 900, letterSpacing: -0.6, margin: 0 } as React.CSSProperties,
    subtitle: { margin: "6px 0 0", color: "#4b5563", fontSize: 14, fontWeight: 650 } as React.CSSProperties,
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.75)",
      boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
      fontSize: 13,
      color: "#111827",
      fontWeight: 800,
      whiteSpace: "nowrap",
    } as React.CSSProperties,
    list: { display: "flex", flexDirection: "column", gap: 10 } as React.CSSProperties,
    card: {
      background: "rgba(255,255,255,0.90)",
      border: "1px solid rgba(15,23,42,0.10)",
      boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
      borderRadius: 18,
      padding: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    } as React.CSSProperties,
    left: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 } as React.CSSProperties,
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 16,
      background:
        "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(236,72,153,0.92))",
      boxShadow: "0 10px 22px rgba(99,102,241,0.18)",
      overflow: "hidden",
      flex: "0 0 auto",
    } as React.CSSProperties,
    avatarImg: { width: "100%", height: "100%", objectFit: "cover" } as React.CSSProperties,
    textBlock: { minWidth: 0 } as React.CSSProperties,
    topLine: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } as React.CSSProperties,
    name: { fontSize: 15, fontWeight: 900, color: "#111827" } as React.CSSProperties,
    horse: { fontSize: 13, fontWeight: 750, color: "#6b7280" } as React.CSSProperties,
    preview: {
      marginTop: 4,
      fontSize: 14,
      color: "#111827",
      fontWeight: 650,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: 660,
      opacity: 0.92,
    } as React.CSSProperties,
    right: { display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
    badge: {
      background: "linear-gradient(135deg, #ef4444, #f43f5e)",
      color: "white",
      fontWeight: 900,
      fontSize: 12,
      padding: "6px 10px",
      borderRadius: 999,
      minWidth: 30,
      textAlign: "center" as const,
      boxShadow: "0 10px 20px rgba(239,68,68,0.22)",
    } as React.CSSProperties,
    link: {
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.75)",
      textDecoration: "none",
      color: "#111827",
      fontWeight: 850,
      fontSize: 13,
      whiteSpace: "nowrap",
    } as React.CSSProperties,
    skeleton: {
      height: 72,
      borderRadius: 18,
      border: "1px solid rgba(15,23,42,0.10)",
      background:
        "linear-gradient(90deg, rgba(15,23,42,0.04), rgba(15,23,42,0.08), rgba(15,23,42,0.04))",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.2s infinite",
    } as React.CSSProperties,
    empty: {
      borderRadius: 18,
      border: "1px dashed rgba(15,23,42,0.18)",
      padding: 26,
      background: "rgba(255,255,255,0.72)",
      boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <style>{`@keyframes shimmer { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }`}</style>

      <div style={styles.shell}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Messages</h1>
            <p style={styles.subtitle}>Chats with borrowers and owners.</p>
          </div>
          <div style={styles.pill}>
            <span style={{ opacity: 0.7 }}>Unread</span>
            <span style={{ fontWeight: 950 }}>{totalUnread}</span>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={styles.skeleton} />
            <div style={styles.skeleton} />
            <div style={styles.skeleton} />
          </div>
        ) : threads.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6, color: "#111827" }}>
              No messages yet
            </div>
            <div style={{ color: "#4b5563", fontSize: 14, fontWeight: 650, lineHeight: 1.4 }}>
              When you chat with a borrower or owner, conversations will show up here.
            </div>
          </div>
        ) : (
          <div style={styles.list}>
            {threads.map((t) => {
              const name = t.other_display_name ?? "User";
              const horse = t.horse_name ?? "Horse";
              const preview = t.last_message ?? "No messages yet";
              const when = t.last_message_at ? `${timeAgo(t.last_message_at)} ago` : "";
              const unread = t.unread_count ?? 0;

              return (
                <div key={t.request_id} style={styles.card}>
                  <div style={styles.left}>
                    <div style={styles.avatar}>
                      {t.other_avatar_url ? (
                        <img src={t.other_avatar_url} alt={name} style={styles.avatarImg} />
                      ) : null}
                    </div>

                    <div style={styles.textBlock}>
                      <div style={styles.topLine}>
                        <span style={styles.name}>{name}</span>
                        <span style={{ color: "#d1d5db" }}>•</span>
                        <span style={styles.horse}>{horse}</span>
                        {when ? (
                          <>
                            <span style={{ color: "#d1d5db" }}>•</span>
                            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 750 }}>
                              {when}
                            </span>
                          </>
                        ) : null}
                      </div>

                      <div style={styles.preview}>{preview}</div>
                    </div>
                  </div>

                  <div style={styles.right}>
                    {unread > 0 ? <div style={styles.badge}>{unread}</div> : null}
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
