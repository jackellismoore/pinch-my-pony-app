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
  horse: { id: string; name: string | null; image_url?: string | null; location?: string | null } | null;
  borrower: { id: string; display_name: string | null; full_name: string | null } | null;
};

const FK = {
  borrowRequestsHorse: "borrow_requests_horse_id_fkey",
  borrowRequestsBorrower: "borrow_requests_borrower_id_fkey",
} as const;

function normalizeStatus(input: unknown): OwnerRequestDetail["status"] {
  const raw = String(input ?? "").toLowerCase().trim();
  if (raw === "approved") return "approved";
  if (raw === "rejected") return "rejected";
  if (raw === "declined") return "rejected";
  return "pending";
}

function normalizeRow(r: any): OwnerRequestDetail {
  return {
    id: String(r?.id ?? ""),
    status: normalizeStatus(r?.status),
    created_at: String(r?.created_at ?? new Date().toISOString()),
    start_date: r?.start_date ?? null,
    end_date: r?.end_date ?? null,
    message: r?.message ?? null,
    horse: r?.horse
      ? {
          id: String(r.horse.id ?? ""),
          name: r.horse.name ?? null,
          image_url: r.horse.image_url ?? null,
          location: r.horse.location ?? null,
        }
      : null,
    borrower: r?.borrower
      ? {
          id: String(r.borrower.id ?? ""),
          display_name: r.borrower.display_name ?? null,
          full_name: r.borrower.full_name ?? null,
        }
      : null,
  };
}

export function useOwnerRequestDetail(requestId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OwnerRequestDetail | null>(null);

  const load = useCallback(async () => {
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
        horse:horses!${FK.borrowRequestsHorse} ( id, name, image_url, location ),
        borrower:profiles!${FK.borrowRequestsBorrower} ( id, display_name, full_name )
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

    setDetail(normalizeRow(data));
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    if (!requestId) return;
    load();
  }, [requestId, load]);

  return { loading, error, detail, refresh: load, setDetail };
}
