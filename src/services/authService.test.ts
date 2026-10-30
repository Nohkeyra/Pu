import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
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
  ADMIN_TOKEN_KEY,
  ADMIN_BIOMETRIC_PREF_KEY,
} from './authService';
import { NativeBiometric, BiometryType } from '@capacitor-community/native-biometric';
import * as platform from '@/lib/platform';
import * as preferences from '@/lib/preferences';

// Mock dependencies
vi.mock('@capacitor-community/native-biometric', () => ({
  NativeBiometric: {
    isAvailable: vi.fn(),
    verifyIdentity: vi.fn(),
    getCredentials: vi.fn(),
    setCredentials: vi.fn(),
    deleteCredentials: vi.fn(),
  },
  BiometryType: {
    NONE: 0,
    TOUCH_ID: 1,
    FACE_ID: 2,
    FINGERPRINT: 3,
    FACE_AUTHENTICATION: 4,
    IRIS_AUTHENTICATION: 5,
  },
}));

vi.mock('@/lib/platform', () => ({
  isAndroidApk: vi.fn(),
  isAIStudioPreview: vi.fn(),
  getAppEnvironment: vi.fn(),
}));

vi.mock('@/lib/preferences', () => ({
  getSecureItem: vi.fn(),
  setSecureItem: vi.fn(),
  removeSecureItem: vi.fn(),
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('checkBiometricAvailability', () => {
    it('returns isAvailable=false for non-native web/preview platforms', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(false);
      vi.mocked(platform.isAIStudioPreview).mockReturnValue(false);

      const result = await checkBiometricAvailability();
      expect(result.isAvailable).toBe(false);
      expect(result.isNative).toBe(false);
      expect(result.biometryType).toBe('none');
    });

    it('returns isAvailable=true with biometryType when plugin reports availability on native APK', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(platform.isAIStudioPreview).mockReturnValue(false);
      vi.mocked(NativeBiometric.isAvailable).mockResolvedValue({
        isAvailable: true,
        biometryType: BiometryType.FINGERPRINT,
      });

      const result = await checkBiometricAvailability();
      expect(result.isAvailable).toBe(true);
      expect(result.isNative).toBe(true);
      expect(result.biometryType).toBe(BiometryType.FINGERPRINT);
    });

    it('handles native plugin errors gracefully', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(platform.isAIStudioPreview).mockReturnValue(false);
      vi.mocked(NativeBiometric.isAvailable).mockRejectedValue(new Error('Hardware sensor broken'));

      const result = await checkBiometricAvailability();
      expect(result.isAvailable).toBe(false);
      expect(result.reason).toContain('Hardware sensor broken');
    });
  });

  describe('isBiometricAvailable', () => {
    it('returns boolean true when available', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(platform.isAIStudioPreview).mockReturnValue(false);
      vi.mocked(NativeBiometric.isAvailable).mockResolvedValue({
        isAvailable: true,
        biometryType: BiometryType.FINGERPRINT,
      });

      const isAvailable = await isBiometricAvailable();
      expect(isAvailable).toBe(true);
    });

    it('returns boolean false when unavailable', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(false);

      const isAvailable = await isBiometricAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('authenticateAdminWithBiometrics', () => {
    it('fails if biometrics is not available', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(false);

      const result = await authenticateAdminWithBiometrics();
      expect(result.success).toBe(false);
      expect(result.method).toBe('biometric');
      expect(result.errorCode).toBe('BIOMETRIC_UNAVAILABLE');
    });

    it('succeeds when the system prompt passes, without reading or returning any token', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(platform.isAIStudioPreview).mockReturnValue(false);
      vi.mocked(NativeBiometric.isAvailable).mockResolvedValue({
        isAvailable: true,
        biometryType: BiometryType.FINGERPRINT,
      });
      vi.mocked(NativeBiometric.verifyIdentity).mockResolvedValue(undefined as unknown as void);

      const result = await authenticateAdminWithBiometrics({
        title: 'Custom Admin Title',
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe('biometric');
      expect(result.token).toBeUndefined();
      expect(preferences.getSecureItem).not.toHaveBeenCalled();
      expect(NativeBiometric.verifyIdentity).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Admin Title',
        })
      );
    });

    it('returns failure if biometric prompt was cancelled or failed', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(platform.isAIStudioPreview).mockReturnValue(false);
      vi.mocked(NativeBiometric.isAvailable).mockResolvedValue({
        isAvailable: true,
        biometryType: BiometryType.FINGERPRINT,
      });
      vi.mocked(NativeBiometric.verifyIdentity).mockRejectedValue(
        Object.assign(new Error('User cancelled'), { code: 16 })
      );

      const result = await authenticateAdminWithBiometrics();
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('BIOMETRIC_FAILED');
      expect(result.error).toContain('User cancelled');
      expect(result.cancelled).toBe(true);
    });
  });

  describe('verifyAdminMockFallback', () => {
    it('returns the stored token only when the server confirms it', async () => {
      vi.mocked(preferences.getSecureItem).mockResolvedValue('existing_stored_token');
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

      const result = await verifyAdminMockFallback();
      expect(result.success).toBe(true);
      expect(result.method).toBe('mock_fallback');
      expect(result.token).toBe('existing_stored_token');
    });

    it('rejects a stored token the server does not confirm', async () => {
      vi.mocked(preferences.getSecureItem).mockResolvedValue('revoked_token');
      vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

      const result = await verifyAdminMockFallback();
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FALLBACK_PASSWORD_REQUIRED');
    });

    it('rejects a stored token when the server cannot be reached', async () => {
      vi.mocked(preferences.getSecureItem).mockResolvedValue('unverifiable_token');
      vi.mocked(fetch).mockRejectedValue(new Error('offline'));

      const result = await verifyAdminMockFallback();
      expect(result.success).toBe(false);
    });

    it('authenticates with fallback password via server API', async () => {
      vi.mocked(preferences.getSecureItem).mockResolvedValue(null);
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, token: 'new_server_token_456' }),
      } as Response);

      const result = await verifyAdminMockFallback('correct_password');
      expect(result.success).toBe(true);
      expect(result.method).toBe('mock_fallback');
      expect(result.token).toBe('new_server_token_456');
      expect(preferences.setSecureItem).toHaveBeenCalledWith(ADMIN_TOKEN_KEY, 'new_server_token_456');
    });

    it('returns error when server rejects fallback password', async () => {
      vi.mocked(preferences.getSecureItem).mockResolvedValue(null);
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Password incorrect' }),
      } as Response);

      const result = await verifyAdminMockFallback('wrong_password');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
      expect(result.error).toBe('Password incorrect');
    });
  });

  describe('authenticateAdmin', () => {
    it('uses biometric auth when available and successful', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(platform.isAIStudioPreview).mockReturnValue(false);
      vi.mocked(NativeBiometric.isAvailable).mockResolvedValue({
        isAvailable: true,
        biometryType: BiometryType.FINGERPRINT,
      });
      vi.mocked(NativeBiometric.verifyIdentity).mockResolvedValue(undefined as unknown as void);
      vi.mocked(preferences.getSecureItem).mockResolvedValue('admin_token_jwt');
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

      const result = await authenticateAdmin();
      expect(result.success).toBe(true);
      expect(result.method).toBe('biometric');
      expect(result.token).toBe('admin_token_jwt');
    });

    it('falls back to mock verification when biometrics is unavailable and fallback is allowed', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(false);
      vi.mocked(preferences.getSecureItem).mockResolvedValue('fallback_token');
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

      const result = await authenticateAdmin({ allowMockFallback: true });
      expect(result.success).toBe(true);
      expect(result.method).toBe('mock_fallback');
      expect(result.token).toBe('fallback_token');
    });
  });

  describe('Credentials and Session Management', () => {
    it('enrols natively after a confirmation prompt and never touches the admin session token', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(NativeBiometric.isAvailable).mockResolvedValue({
        isAvailable: true,
        biometryType: BiometryType.FINGERPRINT,
      });
      vi.mocked(NativeBiometric.verifyIdentity).mockResolvedValue(undefined as unknown as void);
      vi.mocked(NativeBiometric.setCredentials).mockResolvedValue(undefined as unknown as void);

      const success = await storeAdminBiometricCredentials('admin@example.com', 'p@ssw0rd');
      expect(success).toBe(true);
      expect(NativeBiometric.setCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'admin@example.com', password: 'p@ssw0rd' })
      );
      // Confirmation prompt must come before anything is saved.
      expect(vi.mocked(NativeBiometric.verifyIdentity).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(NativeBiometric.setCredentials).mock.invocationCallOrder[0]
      );
      expect(preferences.setSecureItem).toHaveBeenCalledWith(ADMIN_BIOMETRIC_PREF_KEY, 'true');
      // Regression: the password used to be written over the admin session token.
      expect(preferences.setSecureItem).not.toHaveBeenCalledWith(ADMIN_TOKEN_KEY, expect.anything());
    });

    it('retrieves stored admin token and saves admin token', async () => {
      vi.mocked(preferences.getSecureItem).mockResolvedValue('retrieved_token_123');
      const token = await getStoredAdminToken();
      expect(token).toBe('retrieved_token_123');

      await saveAdminToken('new_token_789');
      expect(preferences.setSecureItem).toHaveBeenCalledWith(ADMIN_TOKEN_KEY, 'new_token_789');
    });

    it('retrieves biometric credentials from the native keystore', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(NativeBiometric.getCredentials).mockResolvedValue({
        username: 'superadmin',
        password: 'vault_password',
      });

      const creds = await getAdminBiometricCredentials();
      expect(creds?.username).toBe('superadmin');
      expect(creds?.password).toBe('vault_password');
    });

    it('deletes biometric credentials and cleans up preferences', async () => {
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(NativeBiometric.deleteCredentials).mockResolvedValue(undefined as unknown as void);

      const deleted = await deleteAdminBiometricCredentials();
      expect(deleted).toBe(true);
      expect(NativeBiometric.deleteCredentials).toHaveBeenCalled();
      expect(preferences.removeSecureItem).toHaveBeenCalledWith(ADMIN_BIOMETRIC_PREF_KEY);
    });

    it('clears the admin session but keeps biometric enrolment by default', async () => {
      vi.mocked(preferences.getSecureItem).mockResolvedValue('token_to_clear');
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(NativeBiometric.deleteCredentials).mockResolvedValue(undefined as unknown as void);
      vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

      await clearAdminSession();
      expect(preferences.removeSecureItem).toHaveBeenCalledWith(ADMIN_TOKEN_KEY);
      expect(NativeBiometric.deleteCredentials).not.toHaveBeenCalled();
      expect(preferences.removeSecureItem).not.toHaveBeenCalledWith(ADMIN_BIOMETRIC_PREF_KEY);
    });

    it('forgets biometric enrolment only when explicitly asked', async () => {
      vi.mocked(preferences.getSecureItem).mockResolvedValue('token_to_clear');
      vi.mocked(platform.isAndroidApk).mockReturnValue(true);
      vi.mocked(NativeBiometric.deleteCredentials).mockResolvedValue(undefined as unknown as void);
      vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

      await clearAdminSession({ forgetBiometrics: true });
      expect(NativeBiometric.deleteCredentials).toHaveBeenCalled();
      expect(preferences.removeSecureItem).toHaveBeenCalledWith(ADMIN_BIOMETRIC_PREF_KEY);
    });

    it('checks if admin is authenticated', async () => {
      vi.mocked(preferences.getSecureItem).mockResolvedValue('valid_token');
      expect(await isAdminAuthenticated()).toBe(true);

      vi.mocked(preferences.getSecureItem).mockResolvedValue(null);
      expect(await isAdminAuthenticated()).toBe(false);
    });
  });
});
