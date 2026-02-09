import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        padding: "16px 32px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "sans-serif",
      }}
    >
      <Link href="/" style={{ fontWeight: "bold", fontSize: 18 }}>
        🐴 Pinch My Pony
      </Link>

      <nav style={{ display: "flex", gap: 16 }}>
  <Link href="/">Home</Link>
  <Link href="/signup">Sign up</Link>
  <Link href="/login">Log in</Link>
</nav>

    </header>
  );
}
