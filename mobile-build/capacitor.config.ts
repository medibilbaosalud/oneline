import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oneline.app',
  appName: 'Oneline',
  webDir: 'public',
  server: {
    url: 'https://oneline-one.vercel.app/', // <--- CAMBIA ESTO POR TU URL REAL
    cleartext: true
  }
};

export default config;
