"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  image_url?: string;
};

export default function ChatPage() {
  const params = useParams();
  const requestId = params?.requestId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    const { data: user } = await supabase.auth.getUser();
    setUserId(user.user?.id || null);

    const { data: request } = await supabase
      .from("borrow_requests")
      .select("status")
      .eq("id", requestId)
      .single();

    if (request?.status === "approved") {
      setApproved(true);
    }

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);

    subscribeRealtime(user.user?.id);
  };

  const subscribeRealtime = (uid: string | undefined) => {
    const channel = supabase.channel("chat-" + requestId);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.keys(state).filter((id) => id !== uid);
        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && uid) {
          await channel.track({ typing: false }, { key: uid });
        }
      });
  };

  const handleTyping = async (value: string) => {
    setNewMessage(value);
    const channel = supabase.channel("chat-" + requestId);
    await channel.track({ typing: value.length > 0 });
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: userId,
      content: newMessage,
    });

    setNewMessage("");
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Conversation</h2>

      {!approved && (
        <p style={{ color: "red" }}>
          This request must be approved before messaging.
        </p>
      )}

      <div
        style={{
          border: "1px solid #ddd",
          padding: 20,
          height: 400,
          overflowY: "auto",
          marginBottom: 20,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              textAlign: msg.sender_id === userId ? "right" : "left",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: 10,
                borderRadius: 10,
                background:
                  msg.sender_id === userId ? "#2563eb" : "#eee",
                color:
                  msg.sender_id === userId ? "#fff" : "#000",
              }}
            >
              {msg.content}
              {msg.image_url && (
                <img
                  src={msg.image_url}
                  style={{ maxWidth: 200, display: "block", marginTop: 8 }}
                />
              )}
            </div>
          </div>
        ))}

        {typingUsers.length > 0 && (
          <p style={{ fontStyle: "italic", color: "#666" }}>
            Someone is typing...
          </p>
        )}
      </div>

      {approved && (
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            style={{ flex: 1, padding: 10 }}
            placeholder="Type message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </div>
  );
}
