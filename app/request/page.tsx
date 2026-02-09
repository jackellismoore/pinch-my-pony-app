export default function RequestPage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 500 }}>
      <h1>Request to Borrow</h1>
      <p>Send a request to the horse owner.</p>

      <form style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label>Your Message</label>
          <textarea
            placeholder="Introduce yourself and explain why you'd be a good match"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <button>
          Send Request
        </button>
      </form>
    </main>
  );
}
