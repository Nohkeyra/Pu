import { Capacitor } from '@capacitor/core';

export type AppEnvironment = 'android_apk' | 'google_ai_studio_preview' | 'webapp';

let cachedEnvironment: AppEnvironment | null = null;

export function getAppEnvironment(): AppEnvironment {
  if (cachedEnvironment) return cachedEnvironment;

  if (typeof window === 'undefined') {
    return 'webapp';
  }

  // 1. Android APK (Capacitor Native)
  if (
    Capacitor.isNativePlatform() ||
    Capacitor.getPlatform() === 'android' ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    navigator.userAgent.includes('Capacitor')
  ) {
    cachedEnvironment = 'android_apk';
    return 'android_apk';
  }

  // 2. Google AI Studio Preview (Iframe or AIS dev/pre cloud container)
  const isIframe = window.self !== window.top;
  const isAISHostname =
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('ai.studio') ||
    window.location.hostname.includes('google');

  if (isIframe || isAISHostname) {
    cachedEnvironment = 'google_ai_studio_preview';
    return 'google_ai_studio_preview';
  }

  // 3. Standard Web App
  cachedEnvironment = 'webapp';
  return 'webapp';
}

export const isAndroidApk = (): boolean => getAppEnvironment() === 'android_apk';
export const isAIStudioPreview = (): boolean => getAppEnvironment() === 'google_ai_studio_preview';
export const isWebapp = (): boolean => getAppEnvironment() === 'webapp';

export function getPlatformHeaders(): Record<string, string> {
  return {
    'X-App-Platform': getAppEnvironment(),
  };
}
