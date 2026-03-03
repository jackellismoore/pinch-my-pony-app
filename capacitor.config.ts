import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pinchmypony.app',
  appName: 'Pinch My Pony',
  webDir: 'out',
  server: {
    url: 'https://pinch-my-pony-app.vercel.app',
    cleartext: false
  }
};

export default config;