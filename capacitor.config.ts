import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wawasanpakusop.app',
  appName: 'Wawasan Pak Usop',
  webDir: 'dist/client',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false,
      statsUrl: "",
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      resetWhenUpdate: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000',
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0B0807',
      showSpinner: false,
      launchFadeOutDuration: 300,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'native',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
