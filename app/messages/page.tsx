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
      const { data: borrowerReqs } = await supabase
        .from("borrow_requests")
        .select("id")
        .eq("borrower_id", userId);

      // Horses I own
      const { data: myHorses } = await supabase
        .from("horses")
        .select("id")
        .eq("owner_id", userId);

      const myHorseIds = (myHorses ?? []).map((h: any) => h.id);

      // Requests for my horses
      let ownerReqs: any[] = [];
      if (myHorseIds.length > 0) {
        const { data } = await supabase
          .from("borrow_requests")
          .select("id")
          .in("horse_id", myHorseIds);

        ownerReqs = data ?? [];
      }

      // Unique request IDs
      const requestIdSet = new Set<string>();
      (borrowerReqs ?? []).forEach((r: any) => requestIdSet.add(r.id));
      (ownerReqs ?? []).forEach((r: any) => requestIdSet.add(r.id));
      const requestIds = Array.from(requestIdSet);

      if (requestIds.length === 0) {
        setThreads([]);
        setDebug({ step: "no_requests" });
        return;
      }

      // Load messages for those requests
      const { data: msgs } = await supabase
        .from("messages")
        .select("request_id, created_at, content")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false });

      const latestMap = new Map<string, Thread>();

      (msgs ?? []).forEach((m: any) => {
        if (!latestMap.has(m.request_id)) {
          latestMap.set(m.request_id, m);
        }
      });

      const latestThreads = Array.from(latestMap.values());

      setThreads(latestThreads);
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
        threads.map((t) => (
          <div
            key={t.request_id}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <div style={{ fontFamily: "monospace", fontSize: 12 }}>
              request_id: {t.request_id}
            </div>

            <div style={{ marginTop: 6, fontSize: 14 }}>
              {t.content}
            </div>

            <div style={{ marginTop: 8 }}>
              <Link href={`/messages/${t.request_id}`}>
                Open Conversation
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
