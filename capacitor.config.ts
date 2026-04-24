import type { CapacitorConfig } from '@capacitor/cli';

// IMPORTANT: For Play Store / Uptodown approval the APK must be a real native
// app — NOT a WebView pointing at a remote URL. So `server.url` is intentionally
// NOT set here. The Android/iOS app loads the bundled `dist/` assets locally
// and works fully offline.
//
// If you want hot-reload during local development, temporarily uncomment the
// `server` block, but REMOVE it again before producing a release build.
const config: CapacitorConfig = {
  appId: 'app.lovable.38ed2fa1b8be4dc3baa7baa53fc43c53',
  appName: 'yourperfectshot',
  webDir: 'dist',
  // server: {
  //   url: 'https://38ed2fa1-b8be-4dc3-baa7-baa53fc43c53.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
