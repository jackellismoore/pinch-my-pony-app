"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
};

export default function MessagePage() {
  const { requestId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (approved) {
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [approved]);

  const initialize = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const { data: request } = await supabase
      .from("borrow_requests")
      .select("status")
      .eq("id", requestId)
      .single();

    if (request?.status === "approved") {
      setApproved(true);
      loadMessages();
    }
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    setMessages(data || []);

    // mark unread messages as read
    if (userId) {
      await supabase
        .from("messages")
        .update({ read: true })
        .neq("sender_id", userId)
        .eq("request_id", requestId);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await supabase.from("messages").insert([
      {
        request_id: requestId,
        sender_id: userId,
        content: newMessage,
      },
    ]);

    setNewMessage("");
    loadMessages();
  };

  if (!approved) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Chat locked</h2>
        <p>Conversation becomes available once the request is approved.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: "auto" }}>
      <h1>Conversation</h1>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 20,
          height: 400,
          overflowY: "auto",
          marginBottom: 20,
          background: "#f9fafb",
        }}
      >
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId;

          return (
            <div
              key={msg.id}
              style={{
                textAlign: isMine ? "right" : "left",
                marginBottom: 15,
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: isMine ? "#2563eb" : "#e5e7eb",
                  color: isMine ? "white" : "black",
                  maxWidth: "70%",
                }}
              >
                {msg.content}
              </div>

              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>
                {new Date(msg.created_at).toLocaleString()}
                {isMine && msg.read && " ✓✓"}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
