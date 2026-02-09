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
        fontFamily: "sans-serif",
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 700,
          fontSize: 20,
          textDecoration: "none",
          color: "#222",
        }}
      >
        🐴 Pinch My Pony
      </Link>

      <nav style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <Link href="/">Home</Link>
        <Link href="/horse">Horses</Link>
        <Link href="/signup">Sign up</Link>

        {/* Disabled login for demo */}
        <span
          style={{
            color: "#999",
            cursor: "not-allowed",
            fontSize: 14,
          }}
          title="Login coming soon"
        >
          Login (coming soon)
        </span>
      </nav>
    </header>
  );
}
