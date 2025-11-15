import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medicea.app',
  appName: 'medicea',
  webDir: 'out', // value is ignored when `server.url` is set
  server: {
    url: 'https://medicea.global',  // your deployed site
    cleartext: false,
  },
};

export default config;
