import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import AppResumeHandler from "@/components/AppResumeHandler";
import AppUrlListener from "@/components/AppUrlListener";
import PushBootstrap from "@/components/PushBootstrap";
import VerificationGate from "@/components/VerificationGate";
import { launchFeatureEnabled } from "@/lib/launchFeatures";
import { LaunchFeaturesProvider } from "@/components/LaunchFeaturesProvider";

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
          </VerificationGate>
        </LaunchFeaturesProvider>
      </body>
    </html>
  );
}
