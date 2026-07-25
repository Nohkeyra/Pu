import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wawasanpakusop.app',
  appName: 'Wawasan Pak Usop',
  webDir: 'dist',
  exclude: ['server.cjs', 'server.cjs.map'],
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0B0807',
      androidSpinnerStyle: 'large',
      showSpinner: true,
      spinnerColor: '#D4A853'
    }
  }
};

export default config;
