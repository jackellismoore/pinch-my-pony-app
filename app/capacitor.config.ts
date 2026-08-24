import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pinchmypony.app",
  appName: "Pinch My Pony",
  // The native shell uses the production Next.js application. API routes,
  // authentication callbacks, and realtime features remain on the hosted app.
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://pinchmypony.com",
    androidScheme: "https",
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DEFAULT",
      backgroundColor: "#ffffff",
    },
  },
};

export default config;
