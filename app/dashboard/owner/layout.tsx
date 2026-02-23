"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

const navItems = [
  { href: "/dashboard/owner", label: "Overview" },
  { href: "/dashboard/owner/horses", label: "Horses" },
  { href: "/dashboard/owner/requests", label: "Requests" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/owner") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function OwnerDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard/owner";

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkRole() {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        if (!cancelled) router.replace("/");
        return;
      }

      const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).single();

      if (cancelled) return;

      if (error || !data || data.role !== "owner") {
        router.replace("/dashboard");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    }

    checkRole();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontSize: 14, color: "rgba(0,0,0,0.6)" }}>
        Loading dashboard…
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div style={shell}>
      <style>{css}</style>

      {/* Mobile tabs */}
      <div className="pmpDashMobileTabs" style={{ padding: "12px 16px 0" }}>
        <div style={tabsPillRow}>
          {navItems.map((it) => {
            const active = isActive(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                style={{
                  ...tabPill,
                  ...(active ? tabPillActive : null),
                  textDecoration: "none",
                }}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Layout grid */}
      <div className="pmpDashGrid" style={grid}>
        {/* Sidebar (desktop) */}
        <aside className="pmpDashSidebar" style={sidebar}>
          <div style={sidebarCard}>
            <div style={{ fontWeight: 950, color: palette.navy, fontSize: 14 }}>Owner Dashboard</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
              Manage listings, requests, and availability.
            </div>

            <div style={{ height: 10 }} />

            <nav style={{ display: "grid", gap: 8 }}>
              {navItems.map((it) => {
                const active = isActive(pathname, it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    style={{
                      ...navLink,
                      ...(active ? navLinkActive : null),
                      textDecoration: "none",
                    }}
                  >
                    <span style={{ fontWeight: 950 }}>{it.label}</span>
                    <span style={{ opacity: 0.65, fontWeight: 900 }}>→</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Quick actions */}
          <div style={{ marginTop: 12, ...sidebarCard }}>
            <Link
              href="/dashboard/owner/horses/add"
              style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
                color: "white",
                border: "1px solid rgba(0,0,0,0.10)",
                boxShadow: "0 14px 34px rgba(31,61,43,0.16)",
                fontWeight: 950,
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              Add a horse →
            </Link>

            <div style={{ height: 10 }} />

            <Link
              href="/browse"
              style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.75)",
                color: palette.navy,
                border: "1px solid rgba(31,42,68,0.18)",
                boxShadow: "0 14px 34px rgba(31,42,68,0.08)",
                fontWeight: 950,
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              View marketplace →
            </Link>
          </div>

          {/* Sign out */}
          <div style={{ marginTop: 12, ...sidebarCard }}>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/");
              }}
              style={{
                width: "100%",
                border: "1px solid rgba(0,0,0,0.14)",
                background: "white",
                padding: "10px 12px",
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={main}>
          <div style={mainInner}>{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

const css = `
  @media (max-width: 980px) {
    .pmpDashGrid { grid-template-columns: 1fr !important; }
    .pmpDashSidebar { display: none !important; }
    .pmpDashMobileTabs { display: block !important; }
  }
  @media (min-width: 981px) {
    .pmpDashMobileTabs { display: none !important; }
  }
`;

const shell: React.CSSProperties = {
  minHeight: "calc(100vh - 60px)",
  background: `radial-gradient(900px 420px at 20% 0%, rgba(200,162,77,0.18), transparent 55%),
               radial-gradient(900px 420px at 90% 20%, rgba(31,61,43,0.14), transparent 58%),
               linear-gradient(180deg, ${palette.cream} 0%, rgba(250,250,250,1) 70%)`,
  paddingBottom: 24,
};

const grid: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "14px 16px 0",
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  gap: 14,
  alignItems: "start",
};

const sidebar: React.CSSProperties = {
  position: "sticky",
  top: 14,
  alignSelf: "start",
};

const main: React.CSSProperties = {
  minWidth: 0,
};

const mainInner: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const sidebarCard: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.82)",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
  padding: 14,
};

const navLink: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.70)",
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: palette.navy,
};

const navLinkActive: React.CSSProperties = {
  border: "1px solid rgba(31,61,43,0.20)",
  background: "rgba(31,61,43,0.08)",
  color: palette.forest,
};

const tabsPillRow: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  padding: 10,
  borderRadius: 18,
  border: "1px solid rgba(31,42,68,0.10)",
  background: "rgba(255,255,255,0.72)",
  boxShadow: "0 12px 30px rgba(31,42,68,0.06)",
};

const tabPill: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 999,
  border: "1px solid rgba(31,42,68,0.14)",
  background: "rgba(255,255,255,0.80)",
  color: palette.navy,
  fontWeight: 950,
  fontSize: 13,
};

const tabPillActive: React.CSSProperties = {
  border: "1px solid rgba(31,61,43,0.20)",
  background: "rgba(31,61,43,0.10)",
  color: palette.forest,
};