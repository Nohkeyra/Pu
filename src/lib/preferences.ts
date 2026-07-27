import { Preferences } from '@capacitor/preferences';

/**
 * A persistence utility that bridges synchronous localStorage with durable
 * Capacitor Preferences (safeguarding against OS cache purges on native
 * platforms).
 *
 * F-37 (audit): despite the function names below (setSecureItem /
 * getSecureItem / CRITICAL_STORAGE_KEYS), NOTHING written through this
 * module is encrypted. Both backing stores are plaintext on disk (WebView
 * local storage DB / SharedPreferences XML) and readable by anyone with
 * file-system access to the device (root, ADB backup, physical extraction).
 * `wawasan_admin_token` — the admin session JWT — goes through this path,
 * so treat that token as plaintext-on-disk. Its 1h expiry (server.ts,
 * /api/admin/login) is the actual mitigation, not this module's naming.
 * The names are kept as-is here to avoid a churny rename across every
 * call site; do not read "secure"/"CRITICAL" as "encrypted" anywhere in
 * this codebase. If real at-rest encryption is wanted later, that requires
 * a Keystore-backed plugin (e.g. Capacitor Secure Storage), which is a
 * bigger decision than this audit should make unilaterally — flagging
 * instead of changing the storage mechanism.
 *
 * Passwords (wawasan_user_password, wawasan_admin_password) are
 * intentionally NOT stored here at all, encrypted or not.
 */
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
 * NOTE: not encrypted — see the F-28 comment above the module-level export.
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  // Always write to localStorage synchronously with safety guard
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore iframe / restricted storage errors
  }

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
  let localVal: string | null = null;
  try {
    localVal = localStorage.getItem(key);
  } catch {
    // Ignore iframe / restricted storage errors
  }

  if (localVal !== null) {
    return localVal;
  }

  try {
    const { value } = await Preferences.get({ key });
    if (value !== null) {
      try {
        localStorage.setItem(key, value); // Sync back to localStorage
      } catch {
        // Ignore
      }
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
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
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
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore
        }
      }
    }
    console.log('Capacitor Preferences successfully synced to localStorage.');
  } catch (err) {
    console.error('Failed to sync Capacitor Preferences to localStorage:', err);
  }
}
