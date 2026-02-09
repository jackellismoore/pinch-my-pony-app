import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 48 }}>
      <h1 style={{ fontSize: 36 }}>
        🐎 Pinch My Pony
      </h1>

      <p style={{ fontSize: 18, maxWidth: 600 }}>
        A trusted community connecting horse owners with responsible borrowers —
        so horses get more love, and riders get more time in the saddle.
      </p>

      <div style={{ marginTop: 32, display: "flex", gap: 16 }}>
        <Link href="/signup">
          <button>Get Started</button>
        </Link>

        <Link href="/horse">
          <button>Browse Horses</button>
        </Link>
      </div>

      {/* How it works */}
      <section style={{ marginTop: 64, maxWidth: 700 }}>
        <h2>🤝 How it works</h2>

        <ol style={{ lineHeight: 1.8, paddingLeft: 20 }}>
          <li>
            <strong>Owners</strong> list their horses and set expectations
          </li>
          <li>
            <strong>Borrowers</strong> browse horses that match their experience
          </li>
          <li>
            Borrow requests are sent and approved directly
          </li>
          <li>
            Everyone enjoys safe, flexible horse time 🐴
          </li>
        </ol>
      </section>

      {/* Trust note */}
      <section style={{ marginTop: 48, maxWidth: 700 }}>
        <h3>🛡️ Built on trust</h3>
        <p>
          All users will be ID-verified. Owners always stay in control of who
          borrows their horses.
        </p>
      </section>
    </main>
  );
}
