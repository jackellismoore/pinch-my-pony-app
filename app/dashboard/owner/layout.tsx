"use client";

import * as React from "react";
import DashboardShell from "@/components/DashboardShell";

export default function OwnerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      {/* ONE container only (DashboardShell already provides maxWidth + background) */}
      <div style={{ display: "grid", gap: 14 }}>
        {children}
      </div>
    </DashboardShell>
  );
}