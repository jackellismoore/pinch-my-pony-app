"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Conversation = {
  id: string;
  request_id: string;
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selected) loadMessages(selected);
  }, [selected]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*");

    setConversations(data || []);
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage || !selected) return;

    await supabase.from("messages").insert({
      conversation_id: selected,
      sender_id: (await supabase.auth.getUser()).data.user?.id,
      content: newMessage,
    });

    setNewMessage("");
    loadMessages(selected);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>💬 Messages</h1>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ width: "30%" }}>
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelected(c.id)}
              style={{
                padding: 12,
                cursor: "pointer",
                background: selected === c.id ? "#eee" : "white",
                marginBottom: 8,
                borderRadius: 6,
              }}
            >
              Conversation {c.id.slice(0, 6)}
            </div>
          ))}
        </div>

        <div style={{ width: "70%" }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                marginBottom: 10,
                padding: 10,
                background: "#f3f4f6",
                borderRadius: 6,
              }}
            >
              {m.content}
            </div>
          ))}

          {selected && (
            <div style={{ marginTop: 20 }}>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ padding: 8, width: "80%" }}
              />
              <button
                onClick={sendMessage}
                style={{
                  padding: 8,
                  marginLeft: 10,
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                }}
              >
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
