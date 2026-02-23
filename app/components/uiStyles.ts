import type React from "react";

export const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

export const pageWrap: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(900px 420px at 20% 10%, rgba(200,162,77,0.12), transparent 55%), radial-gradient(900px 420px at 90% 30%, rgba(31,61,43,0.10), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 70%)",
  padding: "18px 0 44px",
};

export const container: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "0 16px",
};

export const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};

export const h1: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 950,
  color: palette.navy,
};

export const sub: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: "rgba(0,0,0,0.65)",
};

export const card: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.88)",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
};

export const cardPad: React.CSSProperties = {
  padding: 14,
};

export const btnPrimary: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.14)",
  background: "black",
  color: "white",
  padding: "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 950,
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

export const btnSecondary: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.14)",
  background: "white",
  color: "black",
  padding: "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 900,
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

export const dangerBox: React.CSSProperties = {
  border: "1px solid rgba(255,0,0,0.25)",
  background: "rgba(255,0,0,0.06)",
  padding: 12,
  borderRadius: 12,
  fontSize: 13,
};