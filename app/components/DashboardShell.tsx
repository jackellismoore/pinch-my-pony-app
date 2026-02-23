"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

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
  // Overview should only be active on exact match
  if (href === "/dashboard/owner") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function OwnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/dashboard/owner";

  return (
    <DashboardShell>
      <style>{css}</style>

      {/* Mobile tabs */}
      <div className="pmpOwnerMobileTabs" style={mobileTabsWrap}>
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

      <div className="pmpOwnerGrid" style={grid}>
        {/* Sidebar (desktop) */}
        <aside className="pmpOwnerSidebar" style={sidebar}>
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

          {/* Quick action */}
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
              + Add a horse
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main style={main}>
          {/* This keeps content “stacked” nicely */}
          <div style={{ display: "grid", gap: 14 }}>{children}</div>
        </main>
      </div>
    </DashboardShell>
  );
}

/* ---------- styles ---------- */

const css = `
  @media (max-width: 980px) {
    .pmpOwnerGrid { grid-template-columns: 1fr !important; }
    .pmpOwnerSidebar { display: none !important; }
    .pmpOwnerMobileTabs { display: block !important; }
  }
  @media (min-width: 981px) {
    .pmpOwnerMobileTabs { display: none !important; }
  }
`;

const grid: React.CSSProperties = {
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

const mobileTabsWrap: React.CSSProperties = {
  marginBottom: 12,
};

const tabsPillRow: React.CSSProperties = {
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