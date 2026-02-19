"use client";

import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb" }}>
      <Header />

      <main style={{ paddingBottom: 24 }}>{children}</main>

      <div style={{ marginTop: 24 }}>
        <Footer />
      </div>
    </div>
  );
}
