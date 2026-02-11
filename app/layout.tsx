import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Pinch My Pony",
  description: "Borrow and share horses near you",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet/dist/leaflet.css"
        />
      </head>

      <body>
        {/* HEADER */}
        <header
          style={{
            padding: "15px 40px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 22,
              fontWeight: 600,
              textDecoration: "none",
              color: "#111",
            }}
          >
            🐎 Pinch My Pony
          </Link>

          <nav style={{ display: "flex", gap: 20 }}>
            <Link href="/browse">Browse</Link>
            <Link href="/horse">Add Horse</Link>
            <Link href="/dashboard/owner">Owner</Link>
            <Link href="/dashboard/borrower">Borrower</Link>
            <Link href="/profile">Profile</Link>
          </nav>
        </header>

        {/* PAGE CONTENT */}
        {children}
      </body>
    </html>
  );
}
