"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export type OwnerRequestRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  message: string | null;
  horse: { id: string; name: string | null } | null;
  borrower: { id: string; display_name: string | null; full_name: string | null } | null;
};

type Summary = {
  totalHorses: number;
  pendingRequests: number;
  approvedRequests: number;
  activeBorrows: number;
};

// If your FK names ever differ, change them here in one place.
const FK = {
  borrowRequestsHorse: "borrow_requests_horse_id_fkey",
  borrowRequestsBorrower: "borrow_requests_borrower_id_fkey",
} as const;

function normalizeStatus(input: unknown): OwnerRequestRow["status"] {
  const raw = String(input ?? "").toLowerCase().trim();
  if (raw === "approved") return "approved";
  if (raw === "rejected") return "rejected";
  if (raw === "declined") return "rejected"; // legacy mapping
  return "pending";
}

function isActiveBorrow(row: OwnerRequestRow, now = new Date()): boolean {
  if (row.status !== "approved") return false;
  if (!row.start_date || !row.end_date) return false;
  const start = new Date(row.start_date);
  const end = new Date(row.end_date);
  return start <= now && now <= end;
}

function normalizeRequestRow(r: any): OwnerRequestRow {
  return {
    id: String(r?.id ?? ""),
    status: normalizeStatus(r?.status),
    created_at: String(r?.created_at ?? new Date().toISOString()),
    start_date: r?.start_date ?? null,
    end_date: r?.end_date ?? null,
    message: r?.message ?? null,
    horse: r?.horse
      ? { id: String(r.horse.id ?? ""), name: r.horse.name ?? null }
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

export function useOwnerDashboardData() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requests, setRequests] = useState<OwnerRequestRow[]>([]);
  const [totalHorses, setTotalHorses] = useState<number>(0);

  const [actionBusyById, setActionBusyById] = useState<Record<string, boolean>>(
    {}
  );

  const setBusy = (id: string, busy: boolean) => {
    setActionBusyById((prev) => ({ ...prev, [id]: busy }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      setError(userErr.message);
      setLoading(false);
      return;
    }

    if (!user) {
      setError("Not signed in.");
      setLoading(false);
      return;
    }

    // 1) Get owned horse IDs
    const { data: horses, error: horsesErr } = await supabase
      .from("horses")
      .select("id")
      .eq("owner_id", user.id);

    if (horsesErr) {
      setError(horsesErr.message);
      setLoading(false);
      return;
    }

    const horseIds = (horses ?? []).map((h: any) => h.id as string);
    setTotalHorses(horseIds.length);

    if (horseIds.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // 2) Requests + joins (explicit FK names)
    const { data: rows, error: reqErr } = await supabase
      .from("borrow_requests")
      .select(
        `
          id,
          status,
          created_at,
          start_date,
          end_date,
          message,
          horse:horses!${FK.borrowRequestsHorse} ( id, name ),
          borrower:profiles!${FK.borrowRequestsBorrower} ( id, display_name, full_name )
        `
      )
      .in("horse_id", horseIds)
      .order("created_at", { ascending: false });

    if (reqErr) {
      setError(reqErr.message);
      setLoading(false);
      return;
    }

    setRequests((rows ?? []).map(normalizeRequestRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary: Summary = useMemo(() => {
    const pendingRequests = requests.filter((r) => r.status === "pending").length;
    const approvedRequests = requests.filter((r) => r.status === "approved").length;
    const activeBorrows = requests.filter((r) => isActiveBorrow(r)).length;

    return {
      totalHorses,
      pendingRequests,
      approvedRequests,
      activeBorrows,
    };
  }, [requests, totalHorses]);

  const approve = useCallback(
    async (row: OwnerRequestRow) => {
      if (row.status !== "pending") return;

      setBusy(row.id, true);

      setRequests((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: "approved" } : r))
      );

      const { error: updateErr } = await supabase
        .from("borrow_requests")
        .update({ status: "approved" })
        .eq("id", row.id);

      if (updateErr) {
        setRequests((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, status: "pending" } : r))
        );
        setError(updateErr.message);
        setBusy(row.id, false);
        return;
      }

      setBusy(row.id, false);
      router.push(`/messages/${row.id}`);
    },
    [router]
  );

  const reject = useCallback(async (row: OwnerRequestRow) => {
    if (row.status !== "pending") return;

    setBusy(row.id, true);

    setRequests((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: "rejected" } : r))
    );

    const { error: updateErr } = await supabase
      .from("borrow_requests")
      .update({ status: "rejected" })
      .eq("id", row.id);

    if (updateErr) {
      setRequests((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: "pending" } : r))
      );
      setError(updateErr.message);
      setBusy(row.id, false);
      return;
    }

    setBusy(row.id, false);
  }, []);

  return {
    loading,
    error,
    summary,
    requests,
    refresh: load,
    approve,
    reject,
    actionBusyById,
  };
}
