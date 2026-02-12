"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 40, marginBottom: 20 }}>
        🐴 Pinch My Pony
      </h1>

      <p style={{ marginBottom: 30, fontSize: 18 }}>
        Borrow or share horses safely and easily.
      </p>

      <div style={{ display: "flex", gap: 20 }}>
        <Link href="/login">
          <button style={buttonStyle}>Login</button>
        </Link>

        <Link href="/signup">
          <button style={buttonStyle}>Sign Up</button>
        </Link>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "12px 20px",
  borderRadius: 8,
  background: "#2563eb",
  color: "white",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
};
