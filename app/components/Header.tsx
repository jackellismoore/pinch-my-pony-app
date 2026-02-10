import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        padding: "16px 24px",
        borderBottom: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Link
        href="/"
        style={{
          fontSize: 20,
          fontWeight: 700,
          textDecoration: "none",
          color: "#000",
        }}
      >
        🐎 Pinch My Pony
      </Link>

      <nav style={{ display: "flex", gap: 16 }}>
        <Link href="/browse">Browse</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/login">Login</Link>
        <Link href="/signup">Sign up</Link>
      </nav>
    </header>
  );
}
