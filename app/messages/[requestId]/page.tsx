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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

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

    loadMessages();

    supabase
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
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  const uploadImage = async () => {
    if (!selectedFile) return null;

    const filePath = `${requestId}/${Date.now()}-${selectedFile.name}`;

    const { error } = await supabase.storage
      .from("chat-images")
      .upload(filePath, selectedFile);

    if (error) return null;

    const { data } = supabase.storage
      .from("chat-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    let imageUrl = null;

    if (selectedFile) {
      imageUrl = await uploadImage();
    }

    await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: userId,
      content: newMessage,
      image_url: imageUrl,
    });

    setNewMessage("");
    setSelectedFile(null);
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
          borderRadius: 10,
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
                maxWidth: "70%",
              }}
            >
              {msg.content}

              {msg.image_url && (
                <img
                  src={msg.image_url}
                  alt="attachment"
                  style={{
                    maxWidth: "100%",
                    marginTop: 8,
                    borderRadius: 8,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {approved && (
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            placeholder="Type message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
          />

          <input
            type="file"
            onChange={(e) =>
              setSelectedFile(e.target.files?.[0] || null)
            }
          />

          <button
            onClick={sendMessage}
            style={{
              padding: "8px 14px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
