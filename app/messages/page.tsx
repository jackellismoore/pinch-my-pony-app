"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type Conversation = {
  id: string;
  request_id: string;
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
      subscribeToMessages(activeConversation);
    }
  }, [activeConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const init = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setConversations(data);
      if (data.length > 0) setActiveConversation(data[0].id);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  const subscribeToMessages = (conversationId: string) => {
    supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !userId) return;

    await supabase.from("messages").insert({
      conversation_id: activeConversation,
      sender_id: userId,
      content: newMessage,
    });

    setNewMessage("");
  };

  return (
    <div style={{ display: "flex", height: "80vh", margin: 40 }}>
      {/* LEFT PANEL - CONVERSATIONS */}
      <div
        style={{
          width: 300,
          borderRight: "1px solid #eee",
          padding: 20,
          background: "#f9fafb",
        }}
      >
        <h3 style={{ marginBottom: 20 }}>Conversations</h3>

        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => setActiveConversation(conv.id)}
            style={{
              padding: 12,
              marginBottom: 10,
              borderRadius: 10,
              cursor: "pointer",
              background:
                activeConversation === conv.id ? "#e5f3ff" : "white",
              border: "1px solid #eee",
            }}
          >
            Conversation
          </div>
        ))}
      </div>

      {/* RIGHT PANEL - CHAT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* MESSAGES */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 30,
            background: "#f3f4f6",
          }}
        >
          {messages.map((msg) => {
            const isMine = msg.sender_id === userId;

            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: isMine ? "flex-end" : "flex-start",
                  marginBottom: 15,
                }}
              >
                <div
                  style={{
                    maxWidth: "60%",
                    padding: "12px 18px",
                    borderRadius: 20,
                    background: isMine ? "#2563eb" : "white",
                    color: isMine ? "white" : "#111827",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div
          style={{
            padding: 20,
            borderTop: "1px solid #eee",
            display: "flex",
            gap: 10,
          }}
        >
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              padding: "12px 20px",
              borderRadius: 10,
              border: "none",
              background: "#2563eb",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
