import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        padding: "16px 40px",
        borderBottom: "1px solid #ddd",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "sans-serif",
      }}
    >
      <Link href="/">
        <strong>🐎 Pinch My Pony</strong>
      </Link>

      <nav>
        <Link href="/signup" style={{ marginLeft: 16 }}>
          Sign up
        </Link>
      </nav>
    </header>
  );
}
