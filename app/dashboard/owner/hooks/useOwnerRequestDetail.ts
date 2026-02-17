"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type OwnerRequestDetail = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  message: string | null;
  horse: { id: string; name: string | null } | null;
  borrower: { id: string; display_name: string | null; full_name: string | null } | null;
};

export function useOwnerRequestDetail(requestId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OwnerRequestDetail | null>(null);

  useEffect(() => {
    if (!requestId) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("borrow_requests")
        .select(`
          id,
          status,
          created_at,
          start_date,
          end_date,
          message,
          horse:horses!borrow_requests_horse_id_fkey ( id, name ),
          borrower:profiles!borrow_requests_borrower_id_fkey ( id, display_name, full_name )
        `)
        .eq("id", requestId)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Request not found.");
        setLoading(false);
        return;
      }

      setDetail(data as OwnerRequestDetail);
      setLoading(false);
    };

    load();
  }, [requestId]);

  return { loading, error, detail, setDetail };
}
