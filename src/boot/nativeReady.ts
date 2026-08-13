import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { StatusBar, Style } from '@capacitor/status-bar';

let done = false;

export async function nativeReady(): Promise<void> {
  if (done || !Capacitor.isNativePlatform()) {
    done = true;
    return;
  }
  done = true;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#00000000' });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: true });
    }
  } catch (_) { /* web fallback */ }

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (_) { /* already hidden */ }

  try {
    await CapacitorUpdater.notifyAppReady();
  } catch (e) {
    console.warn('[OTA] notifyAppReady failed', e);
  }
}
