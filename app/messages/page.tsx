"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type Conversation = {
  id: string;
  request_id: string;
  horse_name: string;
  other_user_name: string;
  unread_count: number;
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
      markAsRead(activeConversation);
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

    // Get conversations joined through borrow_requests
    const { data } = await supabase
      .from("conversations")
      .select(`
        id,
        request_id,
        borrow_requests(
          borrower_id,
          horse_id,
          horses(name, owner_id)
        )
      `);

    if (!data) return;

    const filtered = [];

    for (const conv of data) {
      const request = conv.borrow_requests;
      if (!request) continue;

      const isOwner = request.horses.owner_id === user.id;
      const isBorrower = request.borrower_id === user.id;

      if (!isOwner && !isBorrower) continue;

      // Get other user name
      const otherUserId = isOwner
        ? request.borrower_id
        : request.horses.owner_id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", otherUserId)
        .single();

      // Count unread messages
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", user.id);

      filtered.push({
        id: conv.id,
        request_id: conv.request_id,
        horse_name: request.horses.name,
        other_user_name: profile?.full_name || "User",
        unread_count: count || 0,
      });
    }

    setConversations(filtered);

    if (filtered.length > 0) {
      setActiveConversation(filtered[0].id);
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

  const markAsRead = async (conversationId: string) => {
    if (!userId) return;

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !userId) return;

    await supabase.from("messages").insert({
      conversation_id: activeConversation,
      sender_id: userId,
      content: newMessage,
      read: false,
    });

    setNewMessage("");
  };

  return (
    <div style={{ display: "flex", height: "80vh", margin: 40 }}>
      {/* LEFT PANEL */}
      <div
        style={{
          width: 320,
          borderRight: "1px solid #eee",
          padding: 20,
          background: "#f9fafb",
        }}
      >
        <h3 style={{ marginBottom: 20 }}>Messages</h3>

        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => setActiveConversation(conv.id)}
            style={{
              padding: 15,
              marginBottom: 12,
              borderRadius: 12,
              cursor: "pointer",
              background:
                activeConversation === conv.id ? "#e0f2fe" : "white",
              border: "1px solid #eee",
            }}
          >
            <div style={{ fontWeight: 600 }}>
              {conv.horse_name}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {conv.other_user_name}
            </div>

            {conv.unread_count > 0 && (
              <div
                style={{
                  marginTop: 6,
                  display: "inline-block",
                  background: "#ef4444",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              >
                {conv.unread_count}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CHAT PANEL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
