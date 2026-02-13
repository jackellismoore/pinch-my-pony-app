"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Conversation = {
  id: string;
  horse_id: string;
  owner_id: string;
  borrower_id: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      subscribeToMessages();
    }
  }, [selectedConversation]);

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id || null);
  };

  const loadConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`owner_id.eq.${userId},borrower_id.eq.${userId}`);

    setConversations(data || []);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", selectedConversation)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const subscribeToMessages = () => {
    supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (payload.new.conversation_id === selectedConversation) {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !userId) return;

    await supabase.from("messages").insert({
      conversation_id: selectedConversation,
      sender_id: userId,
      content: newMessage,
    });

    setNewMessage("");
  };

  return (
    <div style={{ display: "flex", height: "80vh", padding: 20 }}>
      {/* LEFT PANEL */}
      <div style={{ width: "30%", borderRight: "1px solid #ddd", paddingRight: 10 }}>
        <h2>Conversations</h2>

        {conversations.length === 0 && <p>No conversations yet.</p>}

        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => setSelectedConversation(conv.id)}
            style={{
              padding: 10,
              marginBottom: 8,
              cursor: "pointer",
              background:
                selectedConversation === conv.id ? "#e5f3ff" : "white",
              borderRadius: 6,
            }}
          >
            Conversation {conv.id.slice(0, 6)}
          </div>
        ))}
      </div>

      {/* CHAT AREA */}
      <div style={{ width: "70%", paddingLeft: 20, display: "flex", flexDirection: "column" }}>
        {selectedConversation ? (
          <>
            <div style={{ flex: 1, overflowY: "auto", marginBottom: 10 }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    textAlign: msg.sender_id === userId ? "right" : "left",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "8px 12px",
                      borderRadius: 16,
                      background:
                        msg.sender_id === userId ? "#2563eb" : "#eee",
                      color:
                        msg.sender_id === userId ? "white" : "black",
                    }}
                  >
                    {msg.content}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex" }}>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #ddd",
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  marginLeft: 10,
                  padding: "10px 16px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                }}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <p>Select a conversation</p>
        )}
      </div>
    </div>
  );
}
