import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>Pinch My Pony</h1>

      <p>
        A trusted community connecting horse owners with responsible borrowers.
      </p>

      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <Link href="/signup">
          <button>Get Started</button>
        </Link>

        <Link href="/browse">
          <button>Browse Horses</button>
        </Link>
      </div>
    </main>
  );
}
