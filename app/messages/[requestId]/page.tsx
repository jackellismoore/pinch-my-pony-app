"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  image_url?: string;
  read: boolean;
};

export default function ChatPage() {
  const params = useParams();
  const requestId = params?.requestId as string;
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initialize = async () => {
    const { data: user } = await supabase.auth.getUser();
    const uid = user.user?.id || null;
    setUserId(uid);

    const { data: request } = await supabase
      .from("borrow_requests")
      .select("status")
      .eq("id", requestId)
      .single();

    if (request?.status === "approved") {
      setApproved(true);
    }

    await markAsRead(uid);
    await loadMessages();

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

  const markAsRead = async (uid: string | null) => {
    if (!uid) return;

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("request_id", requestId)
      .neq("sender_id", uid);
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
      read: false,
    });

    setNewMessage("");
    setSelectedFile(null);
  };

  return (
    <div style={{ padding: 30, maxWidth: 800, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 20 }}>Conversation</h2>

      <div
        style={{
          height: 500,
          overflowY: "auto",
          padding: 20,
          borderRadius: 12,
          background: "#f3f4f6",
        }}
      >
        {messages.map((msg) => {
          const isMe = msg.sender_id === userId;

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: 12,
                  borderRadius: 18,
                  background: isMe ? "#2563eb" : "#ffffff",
                  color: isMe ? "white" : "black",
                }}
              >
                {msg.content}
                {msg.image_url && (
                  <img
                    src={msg.image_url}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      borderRadius: 12,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {approved && (
        <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
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
              padding: "10px 16px",
              background: "#2563eb",
              color: "white",
              borderRadius: 8,
              border: "none",
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
