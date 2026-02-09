import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>🐎 Pinch My Pony</h1>

      <p>
        A trusted community for horse owners and borrowers.
      </p>

      <div style={{ marginTop: 24 }}>
        <Link href="/signup">
          <button>Get Started</button>
        </Link>
      </div>
    </main>
  );
}
