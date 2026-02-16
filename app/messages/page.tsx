"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Thread = {
  request_id: string;
  created_at: string;
  content: string;
};

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [unreadByRequest, setUnreadByRequest] = useState<Record<string, number>>({});
  const [debug, setDebug] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        setDebug({ step: "auth", authErr });
        return;
      }
      const userId = authData.user.id;

      // Requests where I'm borrower
      const { data: borrowerReqs, error: borrowerReqErr } = await supabase
        .from("borrow_requests")
        .select("id")
        .eq("borrower_id", userId);

      if (borrowerReqErr) {
        setDebug({ step: "borrower_requests", borrowerReqErr });
        return;
      }

      // Horses I own
      const { data: myHorses, error: horsesErr } = await supabase
        .from("horses")
        .select("id")
        .eq("owner_id", userId);

      if (horsesErr) {
        setDebug({ step: "my_horses", horsesErr });
        return;
      }

      const myHorseIds = (myHorses ?? []).map((h: any) => h.id);

      // Requests for my horses
      let ownerReqs: any[] = [];
      if (myHorseIds.length > 0) {
        const { data, error: ownerReqErr } = await supabase
          .from("borrow_requests")
          .select("id")
          .in("horse_id", myHorseIds);

        if (ownerReqErr) {
          setDebug({ step: "owner_requests", ownerReqErr });
          return;
        }
        ownerReqs = data ?? [];
      }

      const requestIdSet = new Set<string>();
      (borrowerReqs ?? []).forEach((r: any) => requestIdSet.add(r.id));
      (ownerReqs ?? []).forEach((r: any) => requestIdSet.add(r.id));
      const requestIds = Array.from(requestIdSet);

      if (requestIds.length === 0) {
        setThreads([]);
        setUnreadByRequest({});
        setDebug({ step: "no_requests" });
        return;
      }

      // Latest message per request (we’ll dedupe in JS)
      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("request_id, created_at, content")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false });

      if (msgErr) {
        setDebug({ step: "latest_messages", msgErr });
        return;
      }

      const latestMap = new Map<string, Thread>();
      (msgs ?? []).forEach((m: any) => {
        if (!latestMap.has(m.request_id)) latestMap.set(m.request_id, m);
      });

      const latestThreads = Array.from(latestMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Unread counts: unread = read_at is null AND sender != me
      const { data: unreadMsgs, error: unreadErr } = await supabase
        .from("messages")
        .select("request_id")
        .in("request_id", requestIds)
        .is("read_at", null)
        .neq("sender_id", userId);

      if (unreadErr) {
        setDebug({ step: "unread_messages", unreadErr });
        return;
      }

      const counts: Record<string, number> = {};
      (unreadMsgs ?? []).forEach((m: any) => {
        counts[m.request_id] = (counts[m.request_id] ?? 0) + 1;
      });

      setThreads(latestThreads);
      setUnreadByRequest(counts);
      setDebug({
        step: "done",
        requestIdsCount: requestIds.length,
        threadsCount: latestThreads.length,
      });
    };

    load();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Messages</h1>

      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 16,
          borderRadius: 10,
          fontFamily: "monospace",
          fontSize: 13,
          marginBottom: 20,
          whiteSpace: "pre-wrap",
        }}
      >
        {JSON.stringify(debug, null, 2)}
      </pre>

      {threads.length === 0 ? (
        <p>No conversations yet.</p>
      ) : (
        threads.map((t) => {
          const unread = unreadByRequest[t.request_id] ?? 0;

          return (
            <div
              key={t.request_id}
              style={{
                border: "1px solid #ddd",
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                  request_id: {t.request_id}
                </div>
                <div style={{ marginTop: 6, fontSize: 14, opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.content}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Link href={`/messages/${t.request_id}`}>Open Conversation</Link>
                </div>
              </div>

              {unread > 0 && (
                <div
                  style={{
                    alignSelf: "center",
                    background: "crimson",
                    color: "white",
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    minWidth: 28,
                    textAlign: "center",
                  }}
                >
                  {unread}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
