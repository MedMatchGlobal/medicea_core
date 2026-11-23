import type { CapacitorConfig } from '@capacitor/cli';

// Opt in only when preparing the isolated device-test bundle. Never package
// credentials or a deployment-protection bypass in this URL.
const previewTest = process.env.MEDICEA_ANDROID_TEST_PREVIEW === 'true';
const config: CapacitorConfig = {
  appId: 'global.medicea.app',
  appName: 'mediceaGO',
  webDir: 'build', // value is ignored when `server.url` is set
  server: {
    url: previewTest
      ? 'https://medicea-core-git-design-riviera-601943-medmatchglobals-projects.vercel.app'
      : 'https://medicea.global',
    cleartext: false,
  },
};

export default config;
