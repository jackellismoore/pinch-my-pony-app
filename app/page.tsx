import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 48, textAlign: "center" }}>
      <h1 style={{ fontSize: 40 }}>🐴 Pinch My Pony</h1>
      <p style={{ fontSize: 18, color: "#555", marginTop: 12 }}>
        Borrow horses. Share care. Ride responsibly.
      </p>

      <div style={{ marginTop: 32 }}>
        <Link href="/browse">
          <button style={{ marginRight: 12 }}>
            Browse Horses
          </button>
        </Link>

        <Link href="/signup">
          <button>
            Sign Up
          </button>
        </Link>
      </div>
    </main>
  );
}
