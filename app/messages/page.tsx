"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Conversation = {
  id: string;
  horse_name: string;
};

type Message = {
  id: string;
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
    loadApprovedConversations();
  }, []);

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

  const loadApprovedConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select(`
        id,
        borrow_requests(
          horses(name)
        )
      `);

    if (!data) return;

    const mapped = data.map((conv: any) => ({
      id: conv.id,
      horse_name: conv.borrow_requests?.horses?.[0]?.name || "Horse",
    }));

    setConversations(mapped);
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
      .channel("realtime-messages")
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
      {/* LEFT SIDEBAR */}
      <div style={{ width: "30%", borderRight: "1px solid #ddd", paddingRight: 10 }}>
        <h2>Conversations</h2>
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
            {conv.horse_name}
          </div>
        ))}
      </div>

      {/* CHAT WINDOW */}
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
