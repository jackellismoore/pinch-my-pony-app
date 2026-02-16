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

type ThreadInfo = {
  horse_name: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
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
  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Presence + typing UI
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnlineCount, setOtherOnlineCount] = useState(0);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const isAtBottom = () => {
    const el = scrollerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const labelForSender = useMemo(() => {
    return (senderId: string) => (senderId === userId ? "Me" : "Them");
  }, [userId]);

  const markRead = async (uid: string, rid: string) => {
    const { error: updErr } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("request_id", rid)
      .neq("sender_id", uid)
      .is("read_at", null);

    if (!updErr) {
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
        setError("Missing requestId in URL.");
        setLoading(false);
        return;
      }

      // Auth
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        setError("Not logged in.");
        setLoading(false);
        return;
      }
      const uid = authData.user.id;
      setUserId(uid);

      // Header info from view (horse + other person)
      const { data: ti, error: tiErr } = await supabase
        .from("message_threads")
        .select("horse_name, other_display_name, other_avatar_url")
        .eq("request_id", requestId)
        .maybeSingle();

      if (!tiErr) setThreadInfo((ti as ThreadInfo) ?? null);

      // Load messages
      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("id, request_id, sender_id, content, created_at, read_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

      if (msgErr) {
        setError(msgErr.message);
        setLoading(false);
        return;
      }

      setMessages((msgs as MessageRow[]) ?? []);
      setLoading(false);
      setTimeout(scrollToBottom, 30);

      // Mark read on open
      await markRead(uid, requestId);

      // Realtime: new messages
      const msgChannel = supabase
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

            setTimeout(() => {
              if (isAtBottom()) scrollToBottom();
            }, 20);

            if (newMsg.sender_id !== uid) {
              await markRead(uid, requestId);
            }
          }
        )
        .subscribe();

      // Presence + typing channel
      const presenceChannel = supabase.channel(`presence:thread:${requestId}`, {
        config: { presence: { key: uid } },
      });

      presenceChannel.on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const keys = Object.keys(state);
        const others = keys.filter((k) => k !== uid);
        setOtherOnlineCount(others.length);
      });

      presenceChannel.on("broadcast", { event: "typing" }, (evt) => {
        const from = (evt as any)?.payload?.userId as string | undefined;
        const isTyping = (evt as any)?.payload?.isTyping as boolean | undefined;

        if (!from || from === uid) return;
        setOtherTyping(Boolean(isTyping));

        // auto-clear typing after a short delay (in case their "stop" never arrives)
        if (Boolean(isTyping)) {
          window.clearTimeout((typingStopTimerRef.current ?? undefined) as any);
          typingStopTimerRef.current = window.setTimeout(() => setOtherTyping(false), 2000);
        }
      });

      await presenceChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ at: new Date().toISOString() });
        }
      });

      return () => {
        supabase.removeChannel(msgChannel);
        supabase.removeChannel(presenceChannel);
      };
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    init();
  }, [requestId]);

  const sendTyping = async (isTyping: boolean) => {
    if (!requestId || !userId) return;
    const channel = supabase.getChannels().find((c) => c.topic === `presence:thread:${requestId}`);
    if (!channel) return;

    // @ts-ignore broadcast exists on channel type at runtime
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, isTyping },
    });
  };

  const handleChange = async (val: string) => {
    setText(val);

    // typing start
    if (val.trim().length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      sendTyping(true);
      // send "stop typing" after inactivity
      window.clearTimeout((typingStopTimerRef.current ?? undefined) as any);
      typingStopTimerRef.current = window.setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        sendTyping(false);
      }, 900);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      sendTyping(false);
    }
  };

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
      setSending(false);
      return;
    }

    // stop typing
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    sendTyping(false);

    setMessages((prev) => {
      if (prev.some((m) => m.id === (inserted as any).id)) return prev;
      return [...prev, inserted as MessageRow];
    });

    setText("");
    setSending(false);
    setTimeout(scrollToBottom, 20);
  };

  const otherName = threadInfo?.other_display_name ?? "User";
  const horseName = threadInfo?.horse_name ?? "Horse";
  const otherAvatar = threadInfo?.other_avatar_url ?? null;

  const statusText =
    otherTyping ? "Typing…" : otherOnlineCount > 0 ? "Online" : "Offline";

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
      background: "rgba(255,255,255,0.84)",
      boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
      marginBottom: 12,
    } as React.CSSProperties,
    leftHead: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 } as React.CSSProperties,
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 16,
      overflow: "hidden",
      background: "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(236,72,153,0.92))",
      boxShadow: "0 10px 22px rgba(99,102,241,0.18)",
      flex: "0 0 auto",
    } as React.CSSProperties,
    avatarImg: { width: "100%", height: "100%", objectFit: "cover" } as React.CSSProperties,
    titleWrap: { minWidth: 0 } as React.CSSProperties,
    title: { margin: 0, fontSize: 16, fontWeight: 950, letterSpacing: -0.2, color: "#111827" } as React.CSSProperties,
    sub: { marginTop: 3, fontSize: 13, color: "#6b7280", fontWeight: 750 } as React.CSSProperties,
    status: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.80)",
      fontSize: 13,
      fontWeight: 900,
      color: "#111827",
      whiteSpace: "nowrap",
    } as React.CSSProperties,
    dot: (online: boolean) =>
      ({
        width: 9,
        height: 9,
        borderRadius: 999,
        background: online ? "rgba(16,185,129,1)" : "rgba(156,163,175,1)",
        boxShadow: online ? "0 0 0 6px rgba(16,185,129,0.15)" : "none",
      } as React.CSSProperties),
    scroller: {
      height: "70vh",
      overflowY: "auto",
      borderRadius: 18,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.72)",
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
      fontWeight: 650,
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
      fontWeight: 700,
    } as React.CSSProperties,
    stamp: { marginTop: 6, fontSize: 11, opacity: 0.75, fontWeight: 800 } as React.CSSProperties,
    composerWrap: {
      position: "sticky" as const,
      bottom: 12,
      marginTop: 12,
      borderRadius: 18,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.90)",
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
      fontWeight: 650,
    } as React.CSSProperties,
    button: {
      borderRadius: 14,
      padding: "12px 14px",
      border: "1px solid rgba(15,23,42,0.10)",
      background: "linear-gradient(135deg, rgba(16,185,129,0.95), rgba(59,130,246,0.92))",
      color: "white",
      fontWeight: 950,
      cursor: "pointer",
      boxShadow: "0 14px 26px rgba(16,185,129,0.18)",
      whiteSpace: "nowrap",
      opacity: sending ? 0.65 : 1,
    } as React.CSSProperties,
    error: {
      marginTop: 10,
      color: "#b91c1c",
      background: "rgba(254,226,226,0.9)",
      border: "1px solid rgba(185,28,28,0.2)",
      padding: 10,
      borderRadius: 14,
      fontWeight: 800,
      fontSize: 13,
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topBar}>
          <div style={styles.leftHead}>
            <div style={styles.avatar}>
              {otherAvatar ? <img src={otherAvatar} alt={otherName} style={styles.avatarImg} /> : null}
            </div>
            <div style={styles.titleWrap}>
              <div style={styles.title}>
                {otherName} <span style={{ color: "#d1d5db" }}>•</span> {horseName}
              </div>
              <div style={styles.sub}>request_id: {String(requestId)}</div>
            </div>
          </div>

          <div style={styles.status}>
            <span style={styles.dot(otherTyping ? true : otherOnlineCount > 0)} />
            {statusText}
          </div>
        </div>

        <div ref={scrollerRef} style={styles.scroller}>
          {loading ? (
            <div style={{ color: "#6b7280", fontWeight: 800 }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ color: "#6b7280", fontWeight: 800 }}>
              Say hi 👋 — this is the start of your conversation.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <div key={m.id} style={styles.row}>
                  <div style={mine ? styles.bubbleMe : styles.bubbleThem}>
                    {m.content}
                    <div style={styles.stamp}>
                      {labelForSender(m.sender_id)} • {timeAgo(m.created_at)} ago
                      {!mine && m.read_at ? " • read" : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error ? <div style={styles.error}>Error: {error}</div> : null}

        <div style={styles.composerWrap}>
          <input
            value={text}
            onChange={(e) => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              handleChange(e.target.value);
            }}
            placeholder="Write a message…"
            style={styles.input}
            disabled={sending}
            onFocus={() => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              sendTyping(text.trim().length > 0);
            }}
            onBlur={() => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              sendTyping(false);
            }}
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
            style={styles.button}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
