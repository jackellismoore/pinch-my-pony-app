import type { CapacitorConfig } from "@capacitor/cli";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://pinchmypony.com";

const config: CapacitorConfig = {
  appId: "com.pinchmypony.app",
  appName: "Pinch My Pony",
  webDir: "out",
  server: {
    url: appUrl,
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;