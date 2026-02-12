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

type Request = {
  id: string;
  status: string;
  borrower_id: string;
  horses: { name: string }[];
};

export default function MessagePage() {
  const params = useParams();
  const requestId = params.requestId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [request, setRequest] = useState<Request | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await supabase.auth.getUser();
    setCurrentUser(user.data.user?.id || null);

    const { data: reqData } = await supabase
      .from("borrow_requests")
      .select(`
        id,
        status,
        borrower_id,
        horses(name)
      `)
      .eq("id", requestId)
      .single();

    setRequest(reqData);

    const { data: msgData } = await supabase
      .from("messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    setMessages(msgData || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: currentUser,
      content: newMessage,
    });

    setNewMessage("");
    loadData();
  };

  const updateStatus = async (status: string) => {
    await supabase
      .from("borrow_requests")
      .update({ status })
      .eq("id", requestId);

    loadData();
  };

  if (!request) return <div style={{ padding: 40 }}>Loading...</div>;

  const isOwner = currentUser !== request.borrower_id;
  const canChat = request.status === "approved";

  return (
    <div style={{ padding: 40 }}>
      <h1>Conversation</h1>
      <h3>Horse: {request.horses?.[0]?.name}</h3>
      <p>Status: <strong>{request.status}</strong></p>

      {/* Owner Controls */}
      {isOwner && request.status === "pending" && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => updateStatus("approved")}
            style={{
              marginRight: 10,
              background: "#16a34a",
              color: "white",
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
            }}
          >
            Approve
          </button>

          <button
            onClick={() => updateStatus("declined")}
            style={{
              background: "#dc2626",
              color: "white",
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
            }}
          >
            Decline
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: 20,
          borderRadius: 8,
          minHeight: 300,
          marginBottom: 20,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: 12,
              textAlign:
                msg.sender_id === currentUser ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background:
                  msg.sender_id === currentUser
                    ? "#2563eb"
                    : "#f3f4f6",
                color:
                  msg.sender_id === currentUser
                    ? "white"
                    : "black",
                padding: "8px 12px",
                borderRadius: 8,
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <p style={{ color: "#666" }}>
            No messages yet.
          </p>
        )}
      </div>

      {/* Chat Box */}
      {canChat ? (
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              background: "#2563eb",
              color: "white",
              padding: "10px 16px",
              borderRadius: 6,
              border: "none",
            }}
          >
            Send
          </button>
        </div>
      ) : (
        <p style={{ color: "#888" }}>
          {request.status === "pending"
            ? "Waiting for owner approval..."
            : "Request declined. Chat disabled."}
        </p>
      )}
    </div>
  );
}
