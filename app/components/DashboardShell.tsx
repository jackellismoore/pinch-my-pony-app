"use client";

import { ReactNode } from "react";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",

        /* Brand background */
        background: `
          radial-gradient(900px 420px at 20% 0%, rgba(200,162,77,0.18), transparent 55%),
          radial-gradient(900px 420px at 90% 20%, rgba(31,61,43,0.14), transparent 58%),
          linear-gradient(180deg, ${palette.cream} 0%, rgba(250,250,250,1) 70%)
        `,

        padding: "24px 16px 32px",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}