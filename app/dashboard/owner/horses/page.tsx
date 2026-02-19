"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { supabase } from "@/lib/supabaseClient";

type HorseRow = {
  id: string;
  name: string | null;
  location: string | null;
  image_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

export default function OwnerHorsesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horses, setHorses] = useState<HorseRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const uid = userRes.user?.id;
        if (!uid) {
          if (!mounted) return;
          setHorses([]);
          setError("Not signed in.");
          return;
        }

        const { data, error: horsesErr } = await supabase
          .from("horses")
          .select("id,name,location,image_url,is_active,created_at")
          .eq("owner_id", uid)
          .order("created_at", { ascending: false });

        if (horsesErr) throw horsesErr;

        if (!mounted) return;
        setHorses((data ?? []) as HorseRow[]);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load horses.");
        setHorses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    // optional: live refresh if horses change
    const ch = supabase
      .channel("rt:owner_horses")
      .on("postgres_changes", { event: "*", schema: "public", table: "horses" }, () => mounted && load())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <DashboardShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>My Horses</h1>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>Manage your listings.</div>
          </div>

          <Link
            href="/dashboard/owner/horses/add"
            style={{
              background: "black",
              color: "white",
              padding: "10px 14px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 950,
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            + Add Horse
          </Link>
        </div>

        {loading ? <div style={{ marginTop: 14, opacity: 0.7 }}>Loading…</div> : null}

        {error ? (
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(255,0,0,0.25)",
              background: "rgba(255,0,0,0.06)",
              padding: 12,
              borderRadius: 12,
              fontSize: 13,
            }}
          >
            <b>Error:</b> {error}
          </div>
        ) : null}

        {!loading && !error && horses.length === 0 ? (
          <div style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>
            No horses found. Click <b>+ Add Horse</b> to create your first listing.
          </div>
        ) : null}

        {!loading && horses.length > 0 ? (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {horses.map((h) => (
              <div
                key={h.id}
                style={{
                  border: "1px solid rgba(15,23,42,0.10)",
                  borderRadius: 16,
                  background: "white",
                  padding: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid rgba(0,0,0,0.10)",
                      background: "rgba(0,0,0,0.06)",
                      flexShrink: 0,
                    }}
                  >
                    {h.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={h.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 950, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {h.name ?? "Horse"}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {h.location ?? "No location"}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                      Status:{" "}
                      <b style={{ color: h.is_active === false ? "#b91c1c" : "#15803d" }}>
                        {h.is_active === false ? "INACTIVE" : "ACTIVE"}
                      </b>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link
                    href={`/horse/${h.id}`}
                    style={{
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "white",
                      color: "black",
                      padding: "10px 12px",
                      borderRadius: 12,
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    View
                  </Link>

                  <Link
                    href={`/dashboard/owner/horses/edit/${h.id}`}
                    style={{
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "black",
                      color: "white",
                      padding: "10px 12px",
                      borderRadius: 12,
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 950,
                    }}
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
