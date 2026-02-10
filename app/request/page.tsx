export default function RequestPage() {
  return (
    <main style={{ padding: 32, maxWidth: 600, margin: "0 auto" }}>
      <h1>Request a Horse</h1>
      <p style={{ color: "#555" }}>
        Send a request to the owner. Submissions coming soon.
      </p>

      <div style={{ marginTop: 24 }}>
        <label>Start date</label>
        <input type="date" style={{ width: "100%", padding: 8 }} />
      </div>

      <div style={{ marginTop: 16 }}>
        <label>End date</label>
        <input type="date" style={{ width: "100%", padding: 8 }} />
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Message</label>
        <textarea
          placeholder="Tell the owner about your experience..."
          style={{ width: "100%", padding: 8, minHeight: 100 }}
        />
      </div>

      <button
        disabled
        style={{ marginTop: 24, opacity: 0.6 }}
      >
        Submit request (coming soon)
      </button>
    </main>
  );
}
