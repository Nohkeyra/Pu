import { Preferences } from '@capacitor/preferences';

/**
 * A highly professional persistence utility that bridges synchronous localStorage with
 * durable Capacitor Preferences (safeguarding against OS cache purges on native platforms).
 */

// Keys that are critical and should be synced to Capacitor Preferences
//
// IMPORTANT: Passwords (wawasan_user_password, wawasan_admin_password) are
// intentionally NOT stored here. They must never be written to localStorage
// or Capacitor Preferences, since neither is encrypted — both are plaintext
// on disk (WebView local storage DB / SharedPreferences XML respectively)
// and readable by anyone with file access to the device (root, ADB backup).
export const CRITICAL_STORAGE_KEYS = [
  'wawasan_user_email',
  'wawasan_admin_authenticated',
  'wawasan_admin_token',
  'notificationsEnabled',
  'developerMode',
  'app_theme',
  'app_accent',
];

/**
 * Write a key-value pair to both localStorage (for sync access) and Capacitor Preferences (for durability).
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  // Always write to localStorage synchronously
  localStorage.setItem(key, value);

  // Write to durable Capacitor Preferences asynchronously
  try {
    await Preferences.set({ key, value });
  } catch (err) {
    console.error(`Failed to write key "${key}" to Capacitor Preferences:`, err);
  }
}

/**
 * Read a key-value pair. Falls back from localStorage to Capacitor Preferences.
 */
export async function getSecureItem(key: string): Promise<string | null> {
  const localVal = localStorage.getItem(key);
  if (localVal !== null) {
    return localVal;
  }

  try {
    const { value } = await Preferences.get({ key });
    if (value !== null) {
      localStorage.setItem(key, value); // Sync back to localStorage
    }
    return value;
  } catch (err) {
    console.error(`Failed to read key "${key}" from Capacitor Preferences:`, err);
    return null;
  }
}

/**
 * Remove an item from both storages.
 */
export async function removeSecureItem(key: string): Promise<void> {
  localStorage.removeItem(key);
  try {
    await Preferences.remove({ key });
  } catch (err) {
    console.error(`Failed to remove key "${key}" from Capacitor Preferences:`, err);
  }
}

/**
 * Synchronizes Capacitor Preferences to localStorage on app startup.
 * This ensures that subsequent synchronous reads from localStorage are accurate.
 */
export async function syncPreferencesToLocalStorage(): Promise<void> {
  try {
    for (const key of CRITICAL_STORAGE_KEYS) {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        localStorage.setItem(key, value);
      }
    }
    console.log('Capacitor Preferences successfully synced to localStorage.');
  } catch (err) {
    console.error('Failed to sync Capacitor Preferences to localStorage:', err);
  }
}
