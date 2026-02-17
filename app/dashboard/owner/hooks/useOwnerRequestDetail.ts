"use client";

import { useCallback, useEffect, useState } from "react";
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

  const refresh = useCallback(async () => {
    if (!requestId) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("borrow_requests")
      .select(
        `
          id,
          status,
          created_at,
          start_date,
          end_date,
          message,
          horse:horses!borrow_requests_horse_id_fkey ( id, name ),
          borrower:profiles!borrow_requests_borrower_id_fkey ( id, display_name, full_name )
        `
      )
      .eq("id", requestId)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setDetail(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Request not found (or you don’t have access).");
      setDetail(null);
      setLoading(false);
      return;
    }

    setDetail(data as OwnerRequestDetail);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, error, detail, refresh, setDetail };
}
