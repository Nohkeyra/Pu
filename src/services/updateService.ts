import { db } from '@/firebaseConfig';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { getApiUrl } from '@/lib/api';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import semver from 'semver';

export const CURRENT_APP_VERSION = '1.3.43';
export const CURRENT_BUILD_NUMBER = 173;
export const DEFAULT_APK_URL = 'https://github.com/Nohkeyra/Pu/releases/download/v7.0/Wawasan.Hub.apk';

export interface AppVersionConfig {
  latestVersion: string;
  minVersion: string;
  buildNumber: number;
  apkUrl: string;
  bundleUrl?: string; // Capgo OTA Zip bundle URL
  releaseNotes: string[];
  forceUpdate: boolean;
  updatedAt: string;
  publishedBy?: string;
}

export const DEFAULT_VERSION_CONFIG: AppVersionConfig = {
  latestVersion: CURRENT_APP_VERSION,
  minVersion: '1.2.0',
  buildNumber: CURRENT_BUILD_NUMBER,
  apkUrl: DEFAULT_APK_URL,
  bundleUrl: '',
  releaseNotes: [
    'Prestasi aplikasi & kestabilan haptik dipertingkatkan.',
    'Penyelarasan pesanan automatik & keselamatan Firebase diperkemas.',
    'Sokongan muat turun APK langsung dan Capgo OTA Live Updates.'
  ],
  forceUpdate: false,
  updatedAt: new Date().toISOString(),
  publishedBy: 'System Admin'
};

/**
 * Resolves the currently running/installed app version and build number.
 * On native Android / iOS platforms, queries @capacitor/app directly.
 * Otherwise, falls back to the declared constants.
 */
export async function getInstalledAppInfo(): Promise<{ version: string; buildNumber: number }> {
  let version = CURRENT_APP_VERSION;
  let buildNumber = CURRENT_BUILD_NUMBER;

  if (Capacitor.isNativePlatform()) {
    try {
      const info = await CapApp.getInfo();
      if (info?.version) {
        version = info.version;
      }
      if (info?.build) {
        const parsedBuild = parseInt(info.build, 10);
        if (!isNaN(parsedBuild) && parsedBuild > 0) {
          buildNumber = parsedBuild;
        }
      }
    } catch (err) {
      console.warn('[UpdateService] Failed to read native app info:', err);
    }
  }

  return { version, buildNumber };
}

/**
 * Notify Capgo native container that the app bundle loaded successfully.
 * This prevents automatic rollback to the previous version on app launch.
 */
export async function notifyCapgoAppReady() {
  if (Capacitor.isNativePlatform()) {
    try {
      await CapacitorUpdater.notifyAppReady();
      console.log('[Capgo] App marked as ready to confirm successful OTA update.');
    } catch (err) {
      console.warn('[Capgo] notifyAppReady notice:', err);
    }
  }
}

/**
 * Perform Capgo Live OTA Update in native app.
 */
export async function downloadAndApplyCapgoOta(bundleUrl: string, version: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !bundleUrl) {
    return false;
  }
  try {
    const res = await CapacitorUpdater.download({
      url: bundleUrl,
      version: version
    });

    if (res && res.id) {
      await CapacitorUpdater.set({ id: res.id });
      return true;
    }
  } catch (err) {
    console.warn('[Capgo] Direct OTA update failed, falling back to APK:', err);
  }
  return false;
}

/**
 * Compare two semver strings (e.g., "1.2.5" vs "1.2.4") using the robust semver package.
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const cleanV1 = semver.clean(v1) || semver.coerce(v1)?.version || '0.0.0';
  const cleanV2 = semver.clean(v2) || semver.coerce(v2)?.version || '0.0.0';
  return semver.compare(cleanV1, cleanV2);
}

/**
 * Check if a given remote version requires an update compared to local version & build.
 * Ensures that if the user is already on the latest APK version, no update popup or banner is triggered.
 */
export function isUpdateRequired(
  remoteVersion: AppVersionConfig,
  currentVersion: string = CURRENT_APP_VERSION,
  currentBuild: number = CURRENT_BUILD_NUMBER
): {
  hasUpdate: boolean;
  isForce: boolean;
} {
  const verComparison = compareVersions(remoteVersion.latestVersion, currentVersion);
  
  // 1. Remote is strictly newer than current version (e.g. 1.4.0 > 1.3.41)
  const isVersionNewer = verComparison > 0;
  
  // 2. Versions are identical, but remote build number is higher (e.g. build 175 > build 172)
  const isSameVersionHigherBuild = verComparison === 0 && Boolean(
    remoteVersion.buildNumber && 
    currentBuild && 
    remoteVersion.buildNumber > currentBuild
  );
  
  const hasUpdate = isVersionNewer || isSameVersionHigherBuild;

  // IMPORTANT: An update is NEVER forced or flagged if the user is already running the latest or newer release!
  // isForce only applies if an update actually exists AND (remote explicitly set forceUpdate OR current meets less than minVersion).
  const isBelowMin = compareVersions(currentVersion, remoteVersion.minVersion) < 0;
  const isForce = hasUpdate && (Boolean(remoteVersion.forceUpdate) || isBelowMin);

  return { hasUpdate, isForce };
}

/**
 * Fetch latest version configuration directly from Firestore or API fallback.
 */
export async function fetchLatestAppVersion(): Promise<AppVersionConfig> {
  try {
    const docRef = doc(db, 'app_config', 'version');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_VERSION_CONFIG, ...snap.data() } as AppVersionConfig;
    }
  } catch (err) {
    console.warn('[UpdateService] Firestore version check fallback to API:', err);
  }

  // Fallback to Express backend API endpoint
  try {
    const res = await fetch(getApiUrl('/api/app-version'));
    if (res.ok) {
      const data = await res.json();
      if (data && data.latestVersion) {
        return { ...DEFAULT_VERSION_CONFIG, ...data };
      }
    }
  } catch (err) {
    console.warn('[UpdateService] API version check fallback failed:', err);
  }

  return DEFAULT_VERSION_CONFIG;
}

/**
 * Subscribe in real-time to app version updates broadcasted by admins.
 */
export function subscribeToAppUpdates(callback: (config: AppVersionConfig) => void): () => void {
  const docRef = doc(db, 'app_config', 'version');
  
  const unsubscribe = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = { ...DEFAULT_VERSION_CONFIG, ...snap.data() } as AppVersionConfig;
      callback(data);
    } else {
      callback(DEFAULT_VERSION_CONFIG);
    }
  }, (err) => {
    console.warn('[UpdateService] Real-time updates subscription fallback:', err);
    callback(DEFAULT_VERSION_CONFIG);
  });

  return unsubscribe;
}

/**
 * Publish a new app version / live update release (Admin only).
 */
export async function publishAppUpdate(
  updateConfig: Partial<AppVersionConfig>,
  adminToken?: string
): Promise<AppVersionConfig> {
  const payload: AppVersionConfig = {
    ...DEFAULT_VERSION_CONFIG,
    ...updateConfig,
    updatedAt: new Date().toISOString()
  };

  // 1. Write to Firestore doc
  const docRef = doc(db, 'app_config', 'version');
  await setDoc(docRef, payload, { merge: true });

  // 2. Also notify backend API
  try {
    await fetch(getApiUrl('/api/app-version'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('[UpdateService] Failed to notify API of version update:', err);
  }

  return payload;
}
