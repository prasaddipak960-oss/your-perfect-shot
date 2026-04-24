import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.38ed2fa1b8be4dc3baa7baa53fc43c53',
  appName: 'yourperfectshot',
  webDir: 'dist',
  server: {
    url: 'https://38ed2fa1-b8be-4dc3-baa7-baa53fc43c53.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    Camera: {
      // Permission strings shown on iOS / Android prompts
      permissions: ['camera', 'photos'],
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
