"use client";

import * as React from "react";
import DashboardShell from "@/components/DashboardShell";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

export default function OwnerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      {/* Brand background for ALL /dashboard/owner pages */}
      <div
        style={{
          width: "100%",
          minHeight: "calc(100vh - 64px)",
          background: `radial-gradient(900px 420px at 20% 0%, rgba(200,162,77,0.18), transparent 55%),
                       radial-gradient(900px 420px at 90% 20%, rgba(31,61,43,0.14), transparent 58%),
                       linear-gradient(180deg, ${palette.cream} 0%, rgba(250,250,250,1) 70%)`,
          padding: "18px 0 28px",
        }}
      >
        {/* Standard page container */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>{children}</div>
      </div>
    </DashboardShell>
  );
}