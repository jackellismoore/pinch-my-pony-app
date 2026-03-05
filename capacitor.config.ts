import type { CapacitorConfig } from "@capacitor/cli";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://pinchmypony.com";

const config: CapacitorConfig = {
  appId: "com.pinchmypony.app",
  appName: "Pinch My Pony",
  webDir: "dist",

  server: {
    url: appUrl,
    cleartext: false,
  },
};

export default config;