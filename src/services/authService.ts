import { NativeBiometric, BiometryType } from '@capacitor-community/native-biometric';
import { isAndroidApk } from '@/lib/platform';
import { setSecureItem, getSecureItem, removeSecureItem } from '@/lib/preferences';
import { getApiUrl } from '@/lib/api';
import { auth } from '@/firebaseConfig';
import { signInWithCustomToken } from 'firebase/auth';
import { registerPlugin, Capacitor } from '@capacitor/core';

/**
 * Storage keys and server identifiers
 */
export const ADMIN_TOKEN_KEY = 'wawasan_admin_token';
export const ADMIN_BIOMETRIC_SERVER_ID = 'com.wawasanpakusop.app.admin';
export const ADMIN_BIOMETRIC_PREF_KEY = 'wawasan_admin_biometrics_enabled';

export const CUSTOMER_BIOMETRIC_SERVER_ID = 'com.wawasanpakusop.app.customer';
export const CUSTOMER_BIOMETRIC_PREF_KEY = 'wawasan_customer_biometrics_enabled';

const AdminTokenBridge = registerPlugin<{
  saveToken(options: { token: string }): Promise<void>;
  clearToken(): Promise<void>;
}>('AdminTokenBridge');

async function syncAdminTokenToNative(token: string | null): Promise<void> {
  if (!isAndroidApk() || !Capacitor.isPluginAvailable('AdminTokenBridge')) return;
  try {
    if (token) await AdminTokenBridge.saveToken({ token });
    else await AdminTokenBridge.clearToken();
  } catch (err) {
    // Do not silently claim the native widget session was synced. The app login
    // remains available, but the native widget will require a successful sync.
    console.warn('[AuthService] Could not sync admin session to native widget storage:', err);
  }
}

/**
 * Legacy plaintext keys. Earlier builds copied the e-mail AND password into
 * Capacitor Preferences / localStorage whenever the native keystore was
 * unavailable (always true on web). They are never written any more and are
 * purged on boot by purgeLegacyPlaintextCredentials().
 */
const LEGACY_PLAINTEXT_KEYS = [
  'wawasan_admin_email',
  'wawasan_admin_password',
  'wawasan_customer_email',
  'wawasan_customer_password',
] as const;

/** Admin must re-confirm biometrics after the app has been in the background this long. */
export const ADMIN_RELOCK_AFTER_MS = 5 * 60 * 1000;

// In-memory only: resets on every cold start / reload, which is exactly the
// "unlock once per app launch" behaviour users expect from biometric apps.
let adminBiometricUnlocked = false;
export function isAdminBiometricUnlocked(): boolean {
  return adminBiometricUnlocked;
}
export function setAdminBiometricUnlocked(value: boolean): void {
  adminBiometricUnlocked = value;
}

/**
 * Classifies a NativeBiometric rejection using the plugin's own
 * BiometricAuthError codes (capacitor-native-biometric 4.x):
 * 11 APP_CANCEL, 15 SYSTEM_CANCEL, 16 USER_CANCEL, 17 USER_FALLBACK = dismissed;
 * 2 USER_LOCKOUT, 4 USER_TEMPORARY_LOCKOUT = locked out.
 */
export function classifyBiometricError(error: unknown): {
  message: string;
  cancelled: boolean;
  lockedOut: boolean;
} {
  const e = (error ?? {}) as { message?: unknown; code?: unknown };
  const message = typeof e.message === 'string' ? e.message : '';
  const code = Number(e.code);
  const cancelled = [11, 15, 16, 17].includes(code) || /cancel|dismiss/i.test(message);
  const lockedOut = [2, 4].includes(code) || /lock(ed)?\s*out|too many/i.test(message);
  return { message, cancelled, lockedOut };
}

/** Firebase errors that mean the stored e-mail/password no longer work (e.g. password changed). */
export function isStaleCredentialError(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  return (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/user-disabled' ||
    code === 'auth/invalid-login-credentials'
  );
}

/**
 * Remove plaintext credentials left behind by old builds, and any admin
 * "token" that is not JWT-shaped (an old bug stored the admin PASSWORD under
 * the admin token key). Safe to call repeatedly.
 */
export async function purgeLegacyPlaintextCredentials(): Promise<void> {
  for (const key of LEGACY_PLAINTEXT_KEYS) {
    try {
      await removeSecureItem(key);
    } catch (err) {
      console.warn('[AuthService] Could not purge legacy credential key:', key, err);
    }
  }
  try {
    const token = await getSecureItem(ADMIN_TOKEN_KEY);
    if (token && !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) {
      await removeSecureItem(ADMIN_TOKEN_KEY);
    }
  } catch (err) {
    console.warn('[AuthService] Could not validate stored admin token shape:', err);
  }
}

/**
 * Types and Interfaces for Authentication & Biometric states
 */
export interface BiometricAvailability {
  isAvailable: boolean;
  biometryType: BiometryType | 'none' | 'unknown';
  hasEnrolledBiometrics: boolean;
  isNative: boolean;
  errorCode?: number;
  reason?: string;
}

export interface AdminAuthResult {
  success: boolean;
  method: 'biometric' | 'mock_fallback' | 'password';
  token?: string;
  error?: string;
  errorCode?: string | number;
  biometryType?: BiometryType | 'none' | 'unknown';
  /** True when the user dismissed the system prompt (not an error: fall back to password quietly). */
  cancelled?: boolean;
  /** True when the OS locked biometrics after too many failures: password is the only way in. */
  lockedOut?: boolean;
  /** Password login only: whether biometric enrolment was requested and actually completed. */
  biometricEnrolled?: boolean;
}

export interface CustomerBiometricResult {
  success: boolean;
  creds?: { email: string; password: string };
  error?: string;
  cancelled?: boolean;
  lockedOut?: boolean;
}

export interface AdminBiometricAuthOptions {
  reason?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  negativeButtonText?: string;
  maxAttempts?: number;
  useBiometrics?: boolean;
}

export interface AdminAuthOptions {
  allowMockFallback?: boolean;
  fallbackPassword?: string;
  promptOptions?: AdminBiometricAuthOptions;
}

/**
 * Checks biometric hardware availability and user enrollment.
 * Safely handles Web, AI Studio preview, and Native Android / iOS environments.
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  const isNative = isAndroidApk();

  // Non-native environments (Web browsers, dev preview)
  if (!isNative) {
    return {
      isAvailable: false,
      biometryType: 'none',
      hasEnrolledBiometrics: false,
      isNative: false,
      reason: 'Non-native platform (Web/Preview mode)',
    };
  }

  try {
    const result = await NativeBiometric.isAvailable();
    
    // Result contains isAvailable and biometryType
    const isAvailable = Boolean(result && result.isAvailable);
    const biometryType = result?.biometryType !== undefined ? result.biometryType : (isAvailable ? BiometryType.FINGERPRINT : 'none');

    return {
      isAvailable,
      biometryType: biometryType as BiometryType,
      hasEnrolledBiometrics: isAvailable,
      isNative: true,
      errorCode: result?.errorCode,
    };
  } catch (error) {
    console.warn('[AuthService] Native biometric availability check failed:', error);
    return {
      isAvailable: false,
      biometryType: 'unknown',
      hasEnrolledBiometrics: false,
      isNative: true,
      reason: error instanceof Error ? error.message : 'Unknown biometric error',
    };
  }
}

/**
 * Convenient boolean check for biometric availability
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const availability = await checkBiometricAvailability();
  return availability.isAvailable;
}

/**
 * Shows the system biometric prompt (fingerprint / face). It proves the person
 * holding the phone is the enrolled owner and nothing else: it never returns a
 * token or credentials. Callers fetch credentials afterwards.
 */
async function promptBiometric(
  options: AdminBiometricAuthOptions,
  defaults: { reason: string; title: string; description?: string }
): Promise<
  | { ok: true }
  | { ok: false; error: string; cancelled: boolean; lockedOut: boolean }
> {
  try {
    await NativeBiometric.verifyIdentity({
      reason: options.reason || defaults.reason,
      title: options.title || defaults.title,
      subtitle: options.subtitle || 'Imbas cap jari atau pengecaman muka anda',
      description: options.description || defaults.description,
      negativeButtonText: options.negativeButtonText || 'Guna kata laluan',
      maxAttempts: options.maxAttempts || 3,
    });
    return { ok: true };
  } catch (error) {
    const info = classifyBiometricError(error);
    if (!info.cancelled) {
      console.warn('[AuthService] Biometric verification failed:', error);
    }
    return {
      ok: false,
      error: info.message || 'Pengesahan biometrik dibatalkan atau gagal.',
      cancelled: info.cancelled,
      lockedOut: info.lockedOut,
    };
  }
}

/**
 * Authenticates the admin with the system biometric prompt only.
 * The admin session itself is (re)established by the caller from the
 * credentials in the keystore; no token is read or returned here.
 */
export async function authenticateAdminWithBiometrics(
  options: AdminBiometricAuthOptions = {}
): Promise<AdminAuthResult> {
  const availability = await checkBiometricAvailability();

  if (!availability.isAvailable) {
    return {
      success: false,
      method: 'biometric',
      error: availability.reason || 'Biometric authentication is not available on this device.',
      errorCode: availability.errorCode || 'BIOMETRIC_UNAVAILABLE',
      biometryType: availability.biometryType,
    };
  }

  const result = await promptBiometric(options, {
    reason: 'Sahkan identiti untuk mengakses panel kawalan admin Restoran Wawasan.',
    title: 'Pengesahan Biometrik Admin',
    description: 'Hanya kakitangan dan pentadbir yang diberi kuasa sahaja.',
  });

  if (result.ok) {
    return { success: true, method: 'biometric', biometryType: availability.biometryType };
  }
  return {
    success: false,
    method: 'biometric',
    error: result.error,
    errorCode: result.lockedOut ? 'BIOMETRIC_LOCKOUT' : 'BIOMETRIC_FAILED',
    cancelled: result.cancelled,
    lockedOut: result.lockedOut,
    biometryType: availability.biometryType,
  };
}

/**
 * Mock Fallback Authentication for non-biometric devices, web browsers, or preview environments.
 * Allows simulated biometric pass in development/preview or verifies password against the backend.
 */
export async function verifyAdminMockFallback(fallbackPassword?: string): Promise<AdminAuthResult> {
  console.info('[AuthService] Executing mock fallback authentication for non-biometric environment.');

  // If a password was provided, perform actual server verification
  if (fallbackPassword && fallbackPassword.trim().length > 0) {
    try {
      const response = await fetch(getApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: fallbackPassword }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.success && data?.token) {
        await saveAdminToken(data.token);
        return {
          success: true,
          method: 'mock_fallback',
          token: data.token,
        };
      }

      return {
        success: false,
        method: 'mock_fallback',
        error: data?.error || 'Kata laluan tidak sah.',
        errorCode: 'INVALID_CREDENTIALS',
      };
    } catch (err) {
      console.warn('[AuthService] Server authentication request failed in mock fallback:', err);
      return {
        success: false,
        method: 'mock_fallback',
        error: err instanceof Error ? err.message : 'Ralat sambungan pelayan.',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  // If an existing token is already stored, it only counts when the server confirms it.
  const storedToken = await getStoredAdminToken();
  if (storedToken && typeof fetch === 'function') {
    try {
      const verifyRes = await fetch(getApiUrl('/api/admin/verify'), {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      if (verifyRes && verifyRes.ok === true) {
        const verifyData = await verifyRes.json().catch(() => ({}));
        if (verifyData?.firebaseCustomToken) {
          try {
            await signInWithCustomToken(auth, verifyData.firebaseCustomToken);
          } catch (fbErr) {
            console.warn('[Auth] Firebase Auth sync warning:', fbErr);
          }
        }
        return {
          success: true,
          method: 'mock_fallback',
          token: storedToken,
        };
      }
    } catch (e) {
      console.warn('[Auth] Stored token verification check network issue:', e);
    }
  }

  return {
    success: false,
    method: 'mock_fallback',
    error: 'Log masuk dengan kata laluan admin diperlukan.',
    errorCode: 'FALLBACK_PASSWORD_REQUIRED',
  };
}

/**
 * Unified Admin Authentication Handler.
 * Automatically checks biometric availability:
 * - Uses native biometrics if supported and enrolled.
 * - Falls back to mock fallback on web, non-biometric devices, or when requested.
 */
export async function authenticateAdmin(options: AdminAuthOptions = {}): Promise<AdminAuthResult> {
  const { allowMockFallback = true, fallbackPassword, promptOptions } = options;
  const availability = await checkBiometricAvailability();

  if (availability.isAvailable) {
    const biometricResult = await authenticateAdminWithBiometrics(promptOptions);
    if (biometricResult.success) {
      // The prompt only proves presence; the session must still verify on the server.
      const session = await verifyAdminMockFallback();
      if (session.success) {
        return { ...session, method: 'biometric', biometryType: biometricResult.biometryType };
      }
      return session;
    }

    // If biometrics failed and mock fallback is not permitted, return the failure
    if (!allowMockFallback) {
      return biometricResult;
    }
  }

  // Fallback path
  if (allowMockFallback) {
    return await verifyAdminMockFallback(fallbackPassword);
  }

  return {
    success: false,
    method: 'biometric',
    error: 'Biometric authentication is required but unavailable.',
    errorCode: 'BIOMETRIC_UNAVAILABLE',
    biometryType: availability.biometryType,
  };
}

type BiometricRole = 'admin' | 'customer';

const ROLE_CONFIG: Record<BiometricRole, { serverId: string; prefKey: string }> = {
  admin: { serverId: ADMIN_BIOMETRIC_SERVER_ID, prefKey: ADMIN_BIOMETRIC_PREF_KEY },
  customer: { serverId: CUSTOMER_BIOMETRIC_SERVER_ID, prefKey: CUSTOMER_BIOMETRIC_PREF_KEY },
};

export interface BiometricEnrollOptions extends AdminBiometricAuthOptions {
  /** Skip the confirmation prompt (only for callers that just showed one). */
  skipVerify?: boolean;
}

/**
 * Enrol a role for biometric login (opt-in).
 * - Native Android keystore ONLY. There is no plaintext fallback: when the
 *   keystore or biometrics are unavailable this returns false and stores nothing.
 * - Asks for a fingerprint/face scan first, like banking apps do, so enrolment
 *   proves the owner can actually use biometrics before anything is saved.
 */
async function enrollBiometricCredentials(
  role: BiometricRole,
  username: string,
  secret: string,
  options: BiometricEnrollOptions
): Promise<boolean> {
  if (!isAndroidApk() || !username || !secret) return false;
  const { serverId, prefKey } = ROLE_CONFIG[role];

  try {
    const availability = await checkBiometricAvailability();
    if (!availability.isAvailable) return false;

    if (!options.skipVerify) {
      const prompt = await promptBiometric(options, {
        reason: 'Sahkan cap jari / wajah anda untuk mengaktifkan log masuk biometrik.',
        title: 'Aktifkan Log Masuk Biometrik',
      });
      if (!prompt.ok) return false;
    }

    await NativeBiometric.setCredentials({ server: serverId, username, password: secret });
    await setSecureItem(prefKey, 'true');
    return true;
  } catch (error) {
    console.warn(`[AuthService] Failed to enrol ${role} biometric credentials:`, error);
    // Never leave a "enabled" flag behind without credentials to back it.
    await removeSecureItem(prefKey).catch(() => undefined);
    return false;
  }
}

async function readBiometricCredentials(
  role: BiometricRole
): Promise<{ username: string; password: string } | null> {
  if (!isAndroidApk()) return null;
  try {
    const creds = await NativeBiometric.getCredentials({ server: ROLE_CONFIG[role].serverId });
    return creds && creds.username && creds.password
      ? { username: creds.username, password: creds.password }
      : null;
  } catch (error) {
    console.warn(`[AuthService] Failed to read ${role} biometric credentials:`, error);
    return null;
  }
}

async function isBiometricEnabledOnDevice(role: BiometricRole): Promise<boolean> {
  try {
    const flag = await getSecureItem(ROLE_CONFIG[role].prefKey);
    if (flag !== 'true') return false;
    return (await readBiometricCredentials(role)) !== null;
  } catch (err) {
    console.warn(`[AuthService] Failed to check ${role} biometric state:`, err);
    return false;
  }
}

async function deleteBiometricCredentials(role: BiometricRole): Promise<boolean> {
  const { serverId, prefKey } = ROLE_CONFIG[role];
  let keystoreCleared = true;
  if (isAndroidApk()) {
    try {
      await NativeBiometric.deleteCredentials({ server: serverId });
    } catch (error) {
      // Plugin rejects when nothing is stored; that is already the desired end state.
      console.warn(`[AuthService] deleteCredentials(${role}) reported:`, error);
      keystoreCleared = false;
    }
  }
  try {
    await removeSecureItem(prefKey);
    return true;
  } catch (error) {
    console.warn(`[AuthService] Failed to clear ${role} biometric flag:`, error);
    return keystoreCleared;
  }
}

/** Enrol the admin account (e-mail + password) in the hardware-backed keystore. */
export async function storeAdminBiometricCredentials(
  username: string,
  password: string,
  options: BiometricEnrollOptions = {}
): Promise<boolean> {
  return enrollBiometricCredentials('admin', username, password, options);
}

/** Read admin credentials from the keystore. Returns null on web or when none are stored. */
export async function getAdminBiometricCredentials(): Promise<{ username: string; password: string } | null> {
  return readBiometricCredentials('admin');
}

/**
 * True only when the admin opted in AND credentials exist in the keystore.
 * Session restore uses this to decide whether a persisted session may skip the
 * biometric check (it may not when this is true).
 */
export async function isAdminBiometricsEnabledOnDevice(): Promise<boolean> {
  return isBiometricEnabledOnDevice('admin');
}

/** Delete stored admin credentials (explicit "disable biometrics" only). */
export async function deleteAdminBiometricCredentials(): Promise<boolean> {
  return deleteBiometricCredentials('admin');
}

/** Enrol the customer account (e-mail + password) in the hardware-backed keystore. */
export async function storeCustomerBiometricCredentials(
  email: string,
  password: string,
  options: BiometricEnrollOptions = {}
): Promise<boolean> {
  return enrollBiometricCredentials('customer', email, password, options);
}

export async function getCustomerBiometricCredentials(): Promise<{ email: string; password: string } | null> {
  const creds = await readBiometricCredentials('customer');
  return creds ? { email: creds.username, password: creds.password } : null;
}

export async function isCustomerBiometricsEnabledOnDevice(): Promise<boolean> {
  return isBiometricEnabledOnDevice('customer');
}

/** Delete stored customer credentials (explicit "disable biometrics" only). */
export async function deleteCustomerBiometricCredentials(): Promise<boolean> {
  return deleteBiometricCredentials('customer');
}

/**
 * Authenticates the customer: system prompt first, then the stored credentials
 * are handed back so the caller can sign in with Firebase.
 */
export async function authenticateCustomerWithBiometrics(
  options: AdminBiometricAuthOptions = {}
): Promise<CustomerBiometricResult> {
  const availability = await checkBiometricAvailability();

  if (!availability.isAvailable) {
    return {
      success: false,
      error: availability.reason || 'Biometric authentication is not available on this device.',
    };
  }

  const prompt = await promptBiometric(options, {
    reason: 'Sahkan identiti untuk log masuk ke akaun Restoran Wawasan.',
    title: 'Pengesahan Biometrik Pelanggan',
  });
  if (!prompt.ok) {
    return {
      success: false,
      error: prompt.error,
      cancelled: prompt.cancelled,
      lockedOut: prompt.lockedOut,
    };
  }

  const creds = await getCustomerBiometricCredentials();
  if (creds) return { success: true, creds };

  // Flag said "enabled" but the keystore is empty (cleared data, restored phone): reset cleanly.
  await deleteCustomerBiometricCredentials();
  return {
    success: false,
    error: 'Tiada kredensial biometrik disimpan. Sila log masuk dengan kata laluan terlebih dahulu.',
  };
}

/**
 * Retrieve the active admin session token.
 */
export async function getStoredAdminToken(): Promise<string | null> {
  try {
    return await getSecureItem(ADMIN_TOKEN_KEY);
  } catch (err) {
    console.warn('[AuthService] Failed to read stored admin token:', err);
    return null;
  }
}

/**
 * Save active admin session token across Capacitor Preferences and localStorage.
 */
export async function saveAdminToken(token: string): Promise<void> {
  try {
    await setSecureItem(ADMIN_TOKEN_KEY, token);
    await syncAdminTokenToNative(token);
    try {
      window.dispatchEvent(new CustomEvent('admin:login-state-change'));
    } catch {
      // Ignore if event dispatching is not supported in environment
    }
  } catch (err) {
    console.warn('[AuthService] Failed to save admin token:', err);
  }
}

/** Reads the subject (uid) from a JWT without verifying it. Used only to match tokens to a user. */
function jwtSubject(token: string | null): string | null {
  try {
    if (!token) return null;
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { user_id?: string; sub?: string; uid?: string };
    return payload.user_id || payload.sub || payload.uid || null;
  } catch {
    return null;
  }
}

/**
 * Firebase rotates its ID token about hourly. The home-screen widget reads the copy in native
 * storage, so without this it starts failing an hour after the admin last opened the app.
 * Called from Firebase's token-change listener: refreshes the stored + native copy ONLY when
 * an admin session already exists for the same Firebase user. It never creates a session,
 * never fires the login-state event (that would re-verify and loop), and never syncs a
 * customer's token.
 */
export async function syncRefreshedAdminToken(uid: string, freshToken: string): Promise<boolean> {
  try {
    const stored = await getStoredAdminToken();
    if (!stored || !freshToken || stored === freshToken) return false;
    if (jwtSubject(stored) !== uid) return false;
    await setSecureItem(ADMIN_TOKEN_KEY, freshToken);
    await syncAdminTokenToNative(freshToken);
    return true;
  } catch (err) {
    console.warn('[AuthService] Could not refresh admin token copy:', err);
    return false;
  }
}

/**
 * Clear the admin session (server-side logout, stored token, native widget token).
 *
 * Biometric enrolment is KEPT by default, like any banking app: signing out or an
 * expired session must not silently turn biometric login off. Pass
 * `{ forgetBiometrics: true }` only when the user explicitly disables it.
 */
export async function clearAdminSession(options: { forgetBiometrics?: boolean } = {}): Promise<void> {
  try {
    const token = await getStoredAdminToken();
    if (token) {
      try {
        await fetch(getApiUrl('/api/admin/logout'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (logoutErr) {
        console.warn('[AuthService] Server logout endpoint call failed (non-fatal):', logoutErr);
      }
    }

    await removeSecureItem(ADMIN_TOKEN_KEY);
    await syncAdminTokenToNative(null);
    setAdminBiometricUnlocked(false);
    if (options.forgetBiometrics) {
      await deleteAdminBiometricCredentials();
    }

    try {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem('wawasan_admin_authenticated');
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
      // Storage cleanup errors
    }

    try {
      window.dispatchEvent(new CustomEvent('admin:login-state-change'));
    } catch {
      // Ignore
    }
  } catch (err) {
    console.warn('[AuthService] Clear admin session error:', err);
  }
}

/**
 * Check if the current device/browser has an active admin session.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const token = await getStoredAdminToken();
  return Boolean(token && token.trim().length > 0);
}

/**
 * Default export object containing all authService helpers
 */
export const authService = {
  checkBiometricAvailability,
  isBiometricAvailable,
  authenticateAdminWithBiometrics,
  verifyAdminMockFallback,
  authenticateAdmin,
  storeAdminBiometricCredentials,
  getAdminBiometricCredentials,
  isAdminBiometricsEnabledOnDevice,
  deleteAdminBiometricCredentials,
  storeCustomerBiometricCredentials,
  getCustomerBiometricCredentials,
  isCustomerBiometricsEnabledOnDevice,
  deleteCustomerBiometricCredentials,
  authenticateCustomerWithBiometrics,
  purgeLegacyPlaintextCredentials,
  getStoredAdminToken,
  saveAdminToken,
  clearAdminSession,
  isAdminAuthenticated,
};

export default authService;
