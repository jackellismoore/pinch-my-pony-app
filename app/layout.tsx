import "./globals.css";
import Header from "./components/Header";
import LayoutGate from "./components/LayoutGate";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="pmp-appRoot">
          <Header />

          <main className="pmp-appMain">
            <LayoutGate>{children}</LayoutGate>
          </main>
        </div>
      </body>
    </html>
  );
}