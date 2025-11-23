import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'global.medicea.app',
  appName: 'mediceaGO',
  webDir: 'build', // value is ignored when `server.url` is set
  server: {
    url: 'https://medicea.global',  // your deployed site
    cleartext: false,
  },
};

export default config;
