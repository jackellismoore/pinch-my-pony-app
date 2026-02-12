"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

export default function ChatPage() {
  const params = useParams();
  const requestId = params?.requestId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel("chat-" + requestId)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  const loadInitial = async () => {
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

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("request_id", requestId)
      .neq("sender_id", user.user?.id);
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
          background: "#fff",
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
            </div>
          </div>
        ))}
      </div>

      {approved && (
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            style={{ flex: 1, padding: 10 }}
            placeholder="Type message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </div>
  );
}
