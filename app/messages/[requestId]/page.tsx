"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type MessageRow = {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
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

export default function ConversationPage() {
  const params = useParams<{ requestId?: string; id?: string }>();
  const requestId = (params?.requestId ?? params?.id) as string | undefined;

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const isAtBottom = () => {
    const el = scrollerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const markRead = async (uid: string, rid: string) => {
    const { error: updErr } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("request_id", rid)
      .neq("sender_id", uid)
      .is("read_at", null);

    if (updErr) {
      setDebug((d: any) => ({ ...(d ?? {}), step: "mark_read_failed", updErr }));
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id !== uid && m.read_at == null ? { ...m, read_at: new Date().toISOString() } : m
        )
      );
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);

      if (!requestId) {
        setDebug({ step: "no_param", params });
        setError("Missing requestId in URL.");
        setLoading(false);
        return;
      }

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        setError("Not logged in.");
        setDebug({ step: "auth", authErr });
        setLoading(false);
        return;
      }

      const uid = authData.user.id;
      setUserId(uid);

      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("id, request_id, sender_id, content, created_at, read_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

      if (msgErr) {
        setError(msgErr.message);
        setDebug({ step: "load_messages", requestId, msgErr });
        setLoading(false);
        return;
      }

      setMessages((msgs as MessageRow[]) ?? []);
      setDebug({ step: "loaded", requestId, count: msgs?.length ?? 0 });
      setLoading(false);

      setTimeout(scrollToBottom, 50);
      await markRead(uid, requestId);

      const channel = supabase
        .channel(`messages:${requestId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
          async (payload) => {
            const newMsg = payload.new as MessageRow;

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Only auto-scroll if user is near bottom
            setTimeout(() => {
              if (isAtBottom()) scrollToBottom();
            }, 30);

            if (newMsg.sender_id !== uid) {
              await markRead(uid, requestId);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    init();
  }, [requestId]);

  const send = async () => {
    if (!userId) return setError("Not logged in.");
    if (!requestId) return setError("Missing requestId in URL.");

    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);

    const { data: inserted, error: insertErr } = await supabase
      .from("messages")
      .insert({ request_id: requestId, sender_id: userId, content: trimmed })
      .select("id, request_id, sender_id, content, created_at, read_at")
      .single();

    if (insertErr) {
      setError(insertErr.message);
      setDebug({ step: "send_failed", requestId, insertErr });
      setSending(false);
      return;
    }

    setMessages((prev) => {
      if (prev.some((m) => m.id === (inserted as any).id)) return prev;
      return [...prev, inserted as MessageRow];
    });

    setText("");
    setSending(false);
    setTimeout(scrollToBottom, 30);
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(1200px 600px at 20% -10%, rgba(255,105,180,0.18), transparent 60%), radial-gradient(900px 500px at 95% 10%, rgba(99,102,241,0.16), transparent 55%), linear-gradient(180deg, #fbfbff, #ffffff)",
      padding: 18,
    } as React.CSSProperties,
    shell: { maxWidth: 980, margin: "0 auto" } as React.CSSProperties,
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 14,
      borderRadius: 16,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.82)",
      boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
      marginBottom: 12,
    } as React.CSSProperties,
    title: { margin: 0, fontSize: 16, fontWeight: 850, letterSpacing: -0.2 } as React.CSSProperties,
    meta: { marginTop: 2, fontSize: 12, color: "#6b7280", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" } as React.CSSProperties,
    scroller: {
      height: "70vh",
      overflowY: "auto",
      borderRadius: 18,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.70)",
      boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
      padding: 14,
    } as React.CSSProperties,
    row: { display: "flex", marginBottom: 10 } as React.CSSProperties,
    bubbleMe: {
      marginLeft: "auto",
      maxWidth: "78%",
      padding: "10px 12px",
      borderRadius: "16px 16px 6px 16px",
      background: "linear-gradient(135deg, rgba(99,102,241,0.98), rgba(236,72,153,0.92))",
      color: "white",
      boxShadow: "0 14px 30px rgba(99,102,241,0.18)",
      whiteSpace: "pre-wrap",
      lineHeight: 1.35,
      fontWeight: 600,
    } as React.CSSProperties,
    bubbleThem: {
      marginRight: "auto",
      maxWidth: "78%",
      padding: "10px 12px",
      borderRadius: "16px 16px 16px 6px",
      background: "rgba(255,255,255,0.92)",
      border: "1px solid rgba(15,23,42,0.10)",
      color: "#111827",
      boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
      whiteSpace: "pre-wrap",
      lineHeight: 1.35,
      fontWeight: 650,
    } as React.CSSProperties,
    stamp: { marginTop: 6, fontSize: 11, opacity: 0.75, fontWeight: 700 } as React.CSSProperties,
    composerWrap: {
      position: "sticky" as const,
      bottom: 12,
      marginTop: 12,
      borderRadius: 18,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.88)",
      boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
      padding: 12,
      display: "flex",
      gap: 10,
      alignItems: "center",
    } as React.CSSProperties,
    input: {
      flex: 1,
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.95)",
      padding: "12px 12px",
      outline: "none",
      fontSize: 14,
      fontWeight: 600,
    } as React.CSSProperties,
    button: {
      borderRadius: 14,
      padding: "12px 14px",
      border: "1px solid rgba(15,23,42,0.10)",
      background: "linear-gradient(135deg, rgba(16,185,129,0.95), rgba(59,130,246,0.92))",
      color: "white",
      fontWeight: 850,
      cursor: "pointer",
      boxShadow: "0 14px 26px rgba(16,185,129,0.18)",
      whiteSpace: "nowrap",
    } as React.CSSProperties,
    buttonDisabled: {
      opacity: 0.55,
      cursor: "not-allowed",
      boxShadow: "none",
    } as React.CSSProperties,
    error: {
      marginTop: 10,
      color: "#b91c1c",
      background: "rgba(254,226,226,0.9)",
      border: "1px solid rgba(185,28,28,0.2)",
      padding: 10,
      borderRadius: 14,
      fontWeight: 700,
      fontSize: 13,
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topBar}>
          <div>
            <div style={styles.title}>Conversation</div>
            <div style={styles.meta}>request_id: {String(requestId)}</div>
          </div>

          {/* keep debug for now; remove later */}
          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            {debug?.step ? `status: ${debug.step}` : ""}
          </div>
        </div>

        <div ref={scrollerRef} style={styles.scroller}>
          {loading ? (
            <div style={{ color: "#6b7280", fontWeight: 700 }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ color: "#6b7280", fontWeight: 700 }}>No messages yet.</div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <div key={m.id} style={styles.row}>
                  <div style={mine ? styles.bubbleMe : styles.bubbleThem}>
                    {m.content}
                    <div style={styles.stamp}>
                      {timeAgo(m.created_at)} ago
                      {!mine && m.read_at ? " • read" : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div style={styles.error}>Error: {error}</div>}

        <div style={styles.composerWrap}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message…"
            style={styles.input}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                send();
              }
            }}
          />
          <button
            onClick={() => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              send();
            }}
            disabled={sending || text.trim().length === 0}
            style={{
              ...styles.button,
              ...(sending || text.trim().length === 0 ? styles.buttonDisabled : {}),
            }}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
