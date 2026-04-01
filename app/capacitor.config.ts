import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pinchmypony.app",
  appName: "Pinch My Pony",
  webDir: "out",
  server: {
    androidScheme: "https",
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