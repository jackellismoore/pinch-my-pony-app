import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        padding: 16,
        borderBottom: "1px solid #eee",
        marginBottom: 24,
        display: "flex",
        gap: 16,
      }}
    >
      <Link href="/">Home</Link>
      <Link href="/signup">Sign up</Link>
      <Link href="/horse">Horses</Link>
    </header>
  );
}
