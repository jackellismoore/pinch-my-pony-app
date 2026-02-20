import "./globals.css";
import Header from "./components/Header";
import LayoutGate from "./components/LayoutGate";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh" }}>
        <Header />
        <main style={{ minHeight: "calc(100vh - 60px)" }}>
          <LayoutGate>{children}</LayoutGate>
        </main>
      </body>
    </html>
  );
}