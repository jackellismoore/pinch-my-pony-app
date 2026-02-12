"use client";

import Link from "next/link";

export default function BorrowerDashboard() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Borrower Dashboard</h1>

      <p>
        You can manage your requests and conversations here.
      </p>

      <Link href="/messages">
        <button
          style={{
            marginTop: 20,
            padding: "10px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
          }}
        >
          View My Conversations
        </button>
      </Link>
    </div>
  );
}
