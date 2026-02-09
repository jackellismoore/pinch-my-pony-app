import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        background: "white",
        padding: "16px 32px",
        borderBottom: "1px solid #e5e5e5",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 700,
          fontSize: 18,
          textDecoration: "none",
          color: "#222",
        }}
      >
        🐎 Pinch My Pony
      </Link>

      <nav style={{ display: "flex", gap: 20 }}>
        <Link href="/browse">Browse</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/signup">Sign up</Link>
        <Link href="/login">Log in</Link>
      </nav>
    </header>
  );
}
