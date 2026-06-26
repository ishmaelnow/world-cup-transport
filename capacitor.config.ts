import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.worldcuptransport.app',
  appName: 'World Cup Transport',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
