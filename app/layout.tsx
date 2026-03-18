import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "./components/Header";
import LayoutGate from "./components/LayoutGate";

export const metadata: Metadata = {
  title: "Pinch My Pony",
  description: "Horse sharing marketplace",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
};

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