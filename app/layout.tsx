import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import AppResumeHandler from "@/components/AppResumeHandler";
import PushBootstrap from "@/components/PushBootstrap";

export const metadata: Metadata = {
  title: "Pinch My Pony",
  description: "Horse sharing marketplace",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PushBootstrap />
        <AppResumeHandler />
        <Header />
        <main className="pmp-appMain">{children}</main>
      </body>
    </html>
  );
}