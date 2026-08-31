import { NativeBiometric, BiometryType } from '@capacitor-community/native-biometric';
import { isAndroidApk, isAIStudioPreview } from '@/lib/platform';
import { setSecureItem, getSecureItem, removeSecureItem } from '@/lib/preferences';
import { getApiUrl } from '@/lib/api';

/**
 * Storage keys and server identifiers
 */
export const ADMIN_TOKEN_KEY = 'wawasan_admin_token';
export const ADMIN_BIOMETRIC_SERVER_ID = 'com.wawasanpakusop.app.admin';
export const ADMIN_BIOMETRIC_PREF_KEY = 'wawasan_admin_biometrics_enabled';

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
 * Authenticates the admin using Native Biometrics (Fingerprint / Face ID).
 * If successful, attempts to retrieve the stored admin session token or verify stored credentials.
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

  try {
    // Trigger system biometric prompt
    await NativeBiometric.verifyIdentity({
      reason: options.reason || 'Sahkan identiti untuk mengakses panel kawalan admin Restoran Wawasan.',
      title: options.title || 'Pengesahan Biometrik Admin',
      subtitle: options.subtitle || 'Imbas cap jari atau pengecaman muka anda',
      description: options.description || 'Hanya kakitangan dan pentadbir yang diberi kuasa sahaja.',
      negativeButtonText: options.negativeButtonText || 'Batal',
      maxAttempts: options.maxAttempts || 3,
    });

    // Biometric prompt succeeded, retrieve stored token or credentials
    let storedToken = await getStoredAdminToken();

    // Check if biometric credential store contains a valid token/credential
    if (!storedToken) {
      const creds = await getAdminBiometricCredentials();
      if (creds?.password) {
        storedToken = creds.password;
        await saveAdminToken(storedToken);
      }
    }

    return {
      success: true,
      method: 'biometric',
      token: storedToken || undefined,
      biometryType: availability.biometryType,
    };
  } catch (error) {
    console.error('[AuthService] Biometric verification failed or was cancelled:', error);
    const errorMessage = error instanceof Error ? error.message : 'Pengesahan biometrik dibatalkan atau gagal.';

    return {
      success: false,
      method: 'biometric',
      error: errorMessage,
      errorCode: 'BIOMETRIC_FAILED',
      biometryType: availability.biometryType,
    };
  }
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

  // If an existing token is already stored, validate session
  const storedToken = await getStoredAdminToken();
  if (storedToken) {
    return {
      success: true,
      method: 'mock_fallback',
      token: storedToken,
    };
  }

  // Simulated fallback for dev/preview environments when explicitly allowed
  if (isAIStudioPreview() || import.meta.env.DEV) {
    const mockDevToken = 'mock_dev_admin_token_' + Date.now();
    await saveAdminToken(mockDevToken);
    return {
      success: true,
      method: 'mock_fallback',
      token: mockDevToken,
    };
  }

  return {
    success: false,
    method: 'mock_fallback',
    error: 'Biometrik tidak disokong pada peranti ini. Sila log masuk dengan kata laluan.',
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
      return biometricResult;
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

/**
 * Store admin credentials securely in hardware keychain via NativeBiometric plugin.
 */
export async function storeAdminBiometricCredentials(
  username: string,
  tokenOrSecret: string
): Promise<boolean> {
  const isNative = isAndroidApk();
  if (!isNative) {
    await setSecureItem(ADMIN_TOKEN_KEY, tokenOrSecret);
    return true;
  }

  try {
    await NativeBiometric.setCredentials({
      server: ADMIN_BIOMETRIC_SERVER_ID,
      username: username || 'admin',
      password: tokenOrSecret,
    });
    await setSecureItem(ADMIN_BIOMETRIC_PREF_KEY, 'true');
    await setSecureItem(ADMIN_TOKEN_KEY, tokenOrSecret);
    return true;
  } catch (error) {
    console.warn('[AuthService] Failed to set native biometric credentials:', error);
    await setSecureItem(ADMIN_TOKEN_KEY, tokenOrSecret);
    return false;
  }
}

/**
 * Retrieve admin credentials securely from hardware keychain.
 */
export async function getAdminBiometricCredentials(): Promise<{ username: string; password: string } | null> {
  const isNative = isAndroidApk();
  if (!isNative) {
    const token = await getStoredAdminToken();
    return token ? { username: 'admin', password: token } : null;
  }

  try {
    const creds = await NativeBiometric.getCredentials({
      server: ADMIN_BIOMETRIC_SERVER_ID,
    });
    if (creds && creds.password) {
      return { username: creds.username || 'admin', password: creds.password };
    }
    return null;
  } catch (error) {
    console.warn('[AuthService] Failed to retrieve native biometric credentials:', error);
    const fallbackToken = await getStoredAdminToken();
    return fallbackToken ? { username: 'admin', password: fallbackToken } : null;
  }
}

/**
 * Delete stored admin credentials from hardware keychain.
 */
export async function deleteAdminBiometricCredentials(): Promise<boolean> {
  const isNative = isAndroidApk();
  try {
    if (isNative) {
      await NativeBiometric.deleteCredentials({
        server: ADMIN_BIOMETRIC_SERVER_ID,
      });
    }
    await removeSecureItem(ADMIN_BIOMETRIC_PREF_KEY);
    return true;
  } catch (error) {
    console.warn('[AuthService] Failed to delete native biometric credentials:', error);
    return false;
  }
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
    try {
      window.dispatchEvent(new CustomEvent('admin:login-state-change'));
    } catch {
      // Ignore if event dispatching is not supported in environment
    }
  } catch (err) {
    console.warn('[AuthService] Failed to save admin token:', err);
  }
}

/**
 * Clear admin session and revoke credentials.
 */
export async function clearAdminSession(): Promise<void> {
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
    await deleteAdminBiometricCredentials();

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
  deleteAdminBiometricCredentials,
  getStoredAdminToken,
  saveAdminToken,
  clearAdminSession,
  isAdminAuthenticated,
};

export default authService;
