import Link from "next/link";

export default function DashboardPage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Owner Dashboard</h1>
      <p>Manage your horses and requests.</p>

      <section style={{ marginTop: 24 }}>
        <h3>My Horses</h3>

        <div
          style={{
            marginTop: 12,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            maxWidth: 500,
          }}
        >
          <strong>Daisy</strong>
          <p>Calm • Cob</p>

          <Link href="/horse">
            <button style={{ marginTop: 8 }}>
              Edit Horse
            </button>
          </Link>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h3>Borrow Requests</h3>

        <div
          style={{
            marginTop: 12,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            maxWidth: 500,
          }}
        >
          <strong>Alex Taylor</strong>
          <p>Requested Daisy</p>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button>Approve</button>
            <button>Decline</button>
          </div>
        </div>
      </section>
    </main>
  );
}
