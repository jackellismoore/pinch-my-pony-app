import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>🐴 Pinch My Pony</h1>

      <p>
        A trusted community connecting horse owners with responsible borrowers.
      </p>

      <div style={{ marginTop: 24 }}>
        <Link href="/signup">
          <button style={{ marginRight: 12 }}>
            Get Started
          </button>
        </Link>

        <Link href="/horse">
          <button>
            View Horse Profile
          </button>
        </Link>
      </div>
    </main>
  );
}
