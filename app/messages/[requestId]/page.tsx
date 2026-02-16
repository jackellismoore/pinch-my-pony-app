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
  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const labelForSender = useMemo(() => {
    return (senderId: string) => (senderId === userId ? "Me" : "Them");
  }, [userId]);

  const markRead = async (uid: string, rid: string) => {
    // Mark all messages in this request as read WHERE:
    // - not sent by me
    // - unread
    const { error: updErr } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("request_id", rid)
      .neq("sender_id", uid)
      .is("read_at", null);

    if (updErr) {
      setDebug((d: any) => ({ ...(d ?? {}), step: "mark_read_failed", updErr }));
    } else {
      // Update local state too (nice UX)
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

      // ✅ Mark as read when opening the convo
      await markRead(uid, requestId);

      // Realtime: if new message arrives, add it; if it’s from them and we’re viewing, mark read immediately
      const channel = supabase
        .channel(`messages:${requestId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `request_id=eq.${requestId}`,
          },
          async (payload) => {
            const newMsg = payload.new as MessageRow;

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            setTimeout(scrollToBottom, 50);

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
      .insert({
        request_id: requestId,
        sender_id: userId,
        content: trimmed,
      })
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
    setTimeout(scrollToBottom, 50);
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Conversation</h1>

      <div style={{ fontFamily: "monospace", fontSize: 12, marginBottom: 16 }}>
        request_id: {String(requestId)}
      </div>

      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 12,
          borderRadius: 10,
          fontFamily: "monospace",
          fontSize: 12,
          marginBottom: 16,
          whiteSpace: "pre-wrap",
          overflowX: "auto",
        }}
      >
        {JSON.stringify({ params, requestId, debug }, null, 2)}
      </pre>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          height: 420,
          overflowY: "auto",
          background: "#fff",
        }}
      >
        {loading ? (
          <p>Loading…</p>
        ) : messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {labelForSender(m.sender_id)} • {new Date(m.created_at).toLocaleString()}
                {m.sender_id !== userId && m.read_at ? " • read" : ""}
              </div>
              <div style={{ padding: "6px 0" }}>{m.content}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{ marginTop: 12, color: "crimson" }}>
          <b>Error:</b> {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              send();
            }
          }}
          disabled={sending}
        />
        <button
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            send();
          }}
          disabled={sending || text.trim().length === 0}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #ddd",
            cursor: sending ? "not-allowed" : "pointer",
          }}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
