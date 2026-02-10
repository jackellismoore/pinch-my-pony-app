import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 40 }}>
      <h1 style={{ fontSize: 36, marginBottom: 12 }}>
        Find the perfect horse 🐴
      </h1>

      <p style={{ fontSize: 18, maxWidth: 600, marginBottom: 32 }}>
        Pinch My Pony connects trusted horse owners with responsible borrowers —
        whether it’s for riding, care, or companionship.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
        <Link href="/browse">
          <button style={buttonStyle}>Browse Horses</button>
        </Link>

        <Link href="/signup">
          <button style={secondaryButtonStyle}>Sign up</button>
        </Link>
      </div>

      <section>
        <h2>How it works</h2>
        <ul>
          <li>🐎 Owners list their horses</li>
          <li>🤝 Borrowers send requests</li>
          <li>📅 Agree schedules & care</li>
        </ul>
      </section>
    </main>
  );
}

const buttonStyle = {
  padding: "12px 20px",
  fontSize: 16,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  ...buttonStyle,
  background: "#fff",
  border: "1px solid #ccc",
};
