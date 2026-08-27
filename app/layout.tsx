import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile-fixes.css";
import Header from "@/components/Header";
import AppResumeHandler from "@/components/AppResumeHandler";
import AppUrlListener from "@/components/AppUrlListener";
import PushBootstrap from "@/components/PushBootstrap";
import VerificationGate from "@/components/VerificationGate";
import { launchFeatureEnabled } from "@/lib/launchFeatures";
import { LaunchFeaturesProvider } from "@/components/LaunchFeaturesProvider";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://pinchmypony.com"),
  title: { default: "Pinch My Pony | Borrow, share and connect", template: "%s | Pinch My Pony" },
  description: "Discover trusted local horse-sharing opportunities, manage listings and arrange borrowing in one friendly equestrian community.",
  applicationName: "Pinch My Pony",
  keywords: ["horse sharing", "borrow a horse", "horse loan", "equestrian community", "UK horses"],
  openGraph: {
    type: "website",
    siteName: "Pinch My Pony",
    title: "Pinch My Pony | Borrow, share and connect",
    description: "A warm, trusted place to discover, list and share horses.",
    images: [{ url: "/pmp-logo-web.png", width: 512, height: 512, alt: "Pinch My Pony" }],
  },
  twitter: { card: "summary", title: "Pinch My Pony", description: "Borrow, share and connect with the equestrian community.", images: ["/pmp-logo-web.png"] },
  icons: { icon: "/favicon.ico", apple: "/pmp-logo-web.png" },
  manifest: "/manifest.webmanifest",
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
  const identityEnabled = launchFeatureEnabled(process.env.STRIPE_IDENTITY_ENABLED);
  const membershipCheckoutEnabled = launchFeatureEnabled(
    process.env.STRIPE_MEMBERSHIP_CHECKOUT_ENABLED
  );

  return (
    <html lang="en">
      <body>
        <LaunchFeaturesProvider features={{ identityEnabled, membershipCheckoutEnabled }}>
          <PushBootstrap />
          <AppResumeHandler />
          <AppUrlListener />
          <VerificationGate identityEnabled={identityEnabled}>
            <Header identityEnabled={identityEnabled} />
            <main className="pmp-appMain">{children}</main>
            <SiteFooter />
          </VerificationGate>
        </LaunchFeaturesProvider>
      </body>
    </html>
  );
}
