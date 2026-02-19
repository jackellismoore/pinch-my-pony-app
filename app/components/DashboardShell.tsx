"use client";

import { ReactNode } from "react";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        background: "#f6f7fb",
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}
