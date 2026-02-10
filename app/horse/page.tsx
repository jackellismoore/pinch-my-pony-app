import Link from "next/link";

export default function HorsePage() {
  return (
    <main style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32 }}>🐎 Starfire</h1>
      <p style={{ color: "#555" }}>Welsh Cob · Surrey, UK</p>

      <div
        style={{
          marginTop: 24,
          padding: 24,
          border: "2px dashed #ccc",
          borderRadius: 12,
          textAlign: "center",
        }}
      >
        <strong>Horse Photo</strong>
        <p style={{ fontSize: 14, color: "#666" }}>
          Photo upload coming soon
        </p>
      </div>

      <section style={{ marginTop: 32 }}>
        <h2>About Starfire</h2>
        <p>
          Friendly, well-trained horse suitable for leisure riding. Calm
          temperament and ideal for experienced borrowers.
        </p>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Temperament</h2>
        <ul>
          <li>Calm</li>
          <li>Responsive</li>
          <li>Good with other horses</li>
        </ul>
      </section>

      <Link href="/request">
        <button style={{ marginTop: 32 }}>
          Request this horse
        </button>
      </Link>
    </main>
  );
}
