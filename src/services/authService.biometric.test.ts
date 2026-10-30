import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  storeAdminBiometricCredentials,
  getAdminBiometricCredentials,
  storeCustomerBiometricCredentials,
  getCustomerBiometricCredentials,
  authenticateCustomerWithBiometrics,
  deleteCustomerBiometricCredentials,
  isCustomerBiometricsEnabledOnDevice,
  isAdminBiometricsEnabledOnDevice,
  classifyBiometricError,
  isStaleCredentialError,
  purgeLegacyPlaintextCredentials,
  isAdminBiometricUnlocked,
  setAdminBiometricUnlocked,
  ADMIN_TOKEN_KEY,
  ADMIN_BIOMETRIC_PREF_KEY,
  CUSTOMER_BIOMETRIC_PREF_KEY,
} from './authService';
import { NativeBiometric, BiometryType } from '@capacitor-community/native-biometric';
import * as platform from '@/lib/platform';
import * as preferences from '@/lib/preferences';

vi.mock('@capacitor-community/native-biometric', () => ({
  NativeBiometric: {
    isAvailable: vi.fn(),
    verifyIdentity: vi.fn(),
    getCredentials: vi.fn(),
    setCredentials: vi.fn(),
    deleteCredentials: vi.fn(),
  },
  BiometryType: { NONE: 0, TOUCH_ID: 1, FACE_ID: 2, FINGERPRINT: 3, FACE_AUTHENTICATION: 4, IRIS_AUTHENTICATION: 5 },
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

const LEGACY = [
  'wawasan_admin_email',
  'wawasan_admin_password',
  'wawasan_customer_email',
  'wawasan_customer_password',
];

function nativeWithBiometrics() {
  vi.mocked(platform.isAndroidApk).mockReturnValue(true);
  vi.mocked(NativeBiometric.isAvailable).mockResolvedValue({
    isAvailable: true,
    biometryType: BiometryType.FINGERPRINT,
  });
  vi.mocked(NativeBiometric.verifyIdentity).mockResolvedValue(undefined as unknown as void);
  vi.mocked(NativeBiometric.setCredentials).mockResolvedValue(undefined as unknown as void);
  vi.mocked(NativeBiometric.deleteCredentials).mockResolvedValue(undefined as unknown as void);
  vi.mocked(preferences.setSecureItem).mockResolvedValue(undefined);
  vi.mocked(preferences.removeSecureItem).mockResolvedValue(undefined);
}

describe('biometric enrolment: no plaintext credentials, ever', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('stores nothing on web / preview (no localStorage fallback)', async () => {
    vi.mocked(platform.isAndroidApk).mockReturnValue(false);

    expect(await storeAdminBiometricCredentials('a@b.com', 'pw')).toBe(false);
    expect(await storeCustomerBiometricCredentials('c@d.com', 'pw')).toBe(false);
    expect(NativeBiometric.setCredentials).not.toHaveBeenCalled();
    expect(preferences.setSecureItem).not.toHaveBeenCalled();
  });

  it('stores nothing when the device has no enrolled biometrics', async () => {
    nativeWithBiometrics();
    vi.mocked(NativeBiometric.isAvailable).mockResolvedValue({
      isAvailable: false,
      biometryType: BiometryType.NONE,
    });

    expect(await storeCustomerBiometricCredentials('c@d.com', 'pw')).toBe(false);
    expect(NativeBiometric.setCredentials).not.toHaveBeenCalled();
    expect(preferences.setSecureItem).not.toHaveBeenCalled();
  });

  it('stores nothing when the confirmation prompt is cancelled', async () => {
    nativeWithBiometrics();
    vi.mocked(NativeBiometric.verifyIdentity).mockRejectedValue(
      Object.assign(new Error('cancelled'), { code: 16 })
    );

    expect(await storeCustomerBiometricCredentials('c@d.com', 'pw')).toBe(false);
    expect(NativeBiometric.setCredentials).not.toHaveBeenCalled();
    expect(preferences.setSecureItem).not.toHaveBeenCalledWith(CUSTOMER_BIOMETRIC_PREF_KEY, 'true');
  });

  it('on keystore failure writes no plaintext copy and leaves no "enabled" flag', async () => {
    nativeWithBiometrics();
    vi.mocked(NativeBiometric.setCredentials).mockRejectedValue(new Error('keystore broken'));

    expect(await storeAdminBiometricCredentials('a@b.com', 'pw')).toBe(false);
    expect(preferences.setSecureItem).not.toHaveBeenCalled();
    expect(preferences.removeSecureItem).toHaveBeenCalledWith(ADMIN_BIOMETRIC_PREF_KEY);
  });

  it('reads credentials only from the native keystore', async () => {
    vi.mocked(platform.isAndroidApk).mockReturnValue(false);
    expect(await getAdminBiometricCredentials()).toBeNull();
    expect(await getCustomerBiometricCredentials()).toBeNull();
    expect(preferences.getSecureItem).not.toHaveBeenCalled();

    nativeWithBiometrics();
    vi.mocked(NativeBiometric.getCredentials).mockRejectedValue(new Error('nothing stored'));
    expect(await getCustomerBiometricCredentials()).toBeNull();
    // no plaintext fallback read
    expect(preferences.getSecureItem).not.toHaveBeenCalled();
  });
});

describe('role separation and state', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('customer and admin use different keystore entries and flags', async () => {
    nativeWithBiometrics();
    await storeCustomerBiometricCredentials('c@d.com', 'pw1');
    await storeAdminBiometricCredentials('a@b.com', 'pw2');

    const servers = vi.mocked(NativeBiometric.setCredentials).mock.calls.map((c) => c[0].server);
    expect(new Set(servers).size).toBe(2);
    expect(preferences.setSecureItem).toHaveBeenCalledWith(CUSTOMER_BIOMETRIC_PREF_KEY, 'true');
    expect(preferences.setSecureItem).toHaveBeenCalledWith(ADMIN_BIOMETRIC_PREF_KEY, 'true');
  });

  it('"enabled" needs both the flag and stored credentials', async () => {
    nativeWithBiometrics();
    vi.mocked(preferences.getSecureItem).mockResolvedValue('true');
    vi.mocked(NativeBiometric.getCredentials).mockResolvedValue({ username: 'c@d.com', password: 'pw' });
    expect(await isCustomerBiometricsEnabledOnDevice()).toBe(true);

    vi.mocked(NativeBiometric.getCredentials).mockRejectedValue(new Error('empty'));
    expect(await isCustomerBiometricsEnabledOnDevice()).toBe(false);

    vi.mocked(preferences.getSecureItem).mockResolvedValue(null);
    expect(await isAdminBiometricsEnabledOnDevice()).toBe(false);
  });

  it('disabling really removes keystore credentials and the flag', async () => {
    nativeWithBiometrics();
    expect(await deleteCustomerBiometricCredentials()).toBe(true);
    expect(NativeBiometric.deleteCredentials).toHaveBeenCalledTimes(1);
    expect(preferences.removeSecureItem).toHaveBeenCalledWith(CUSTOMER_BIOMETRIC_PREF_KEY);
  });

  it('customer prompt: returns creds after a pass, and flags cancel without error noise', async () => {
    nativeWithBiometrics();
    vi.mocked(NativeBiometric.getCredentials).mockResolvedValue({ username: 'c@d.com', password: 'pw' });
    const ok = await authenticateCustomerWithBiometrics();
    expect(ok.success).toBe(true);
    expect(ok.creds).toEqual({ email: 'c@d.com', password: 'pw' });

    vi.mocked(NativeBiometric.verifyIdentity).mockRejectedValue(
      Object.assign(new Error('Authentication cancelled'), { code: 16 })
    );
    const cancelled = await authenticateCustomerWithBiometrics();
    expect(cancelled.success).toBe(false);
    expect(cancelled.cancelled).toBe(true);
  });

  it('customer prompt: resets an "enabled" flag whose keystore entry has vanished', async () => {
    nativeWithBiometrics();
    vi.mocked(NativeBiometric.getCredentials).mockRejectedValue(new Error('gone'));
    const res = await authenticateCustomerWithBiometrics();
    expect(res.success).toBe(false);
    expect(preferences.removeSecureItem).toHaveBeenCalledWith(CUSTOMER_BIOMETRIC_PREF_KEY);
  });
});

describe('error classification', () => {
  it('treats plugin cancel codes as cancelled and lockout codes as locked out', () => {
    for (const code of [11, 15, 16, 17]) {
      expect(classifyBiometricError({ code, message: 'x' }).cancelled).toBe(true);
    }
    for (const code of [2, 4]) {
      const r = classifyBiometricError({ code, message: 'x' });
      expect(r.lockedOut).toBe(true);
      expect(r.cancelled).toBe(false);
    }
    expect(classifyBiometricError(new Error('User cancelled')).cancelled).toBe(true);
    expect(classifyBiometricError({ code: 10, message: 'Authentication failed' })).toMatchObject({
      cancelled: false,
      lockedOut: false,
    });
    expect(classifyBiometricError(undefined).cancelled).toBe(false);
  });

  it('recognises dead stored credentials (password changed / account gone)', () => {
    for (const code of ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/user-disabled']) {
      expect(isStaleCredentialError({ code })).toBe(true);
    }
    expect(isStaleCredentialError({ code: 'auth/network-request-failed' })).toBe(false);
    expect(isStaleCredentialError(new Error('boom'))).toBe(false);
  });
});

describe('legacy cleanup and unlock flag', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('purges plaintext keys and an admin "token" that is really a password', async () => {
    vi.mocked(preferences.removeSecureItem).mockResolvedValue(undefined);
    vi.mocked(preferences.getSecureItem).mockResolvedValue('hunter2-not-a-jwt');

    await purgeLegacyPlaintextCredentials();
    for (const key of LEGACY) {
      expect(preferences.removeSecureItem).toHaveBeenCalledWith(key);
    }
    expect(preferences.removeSecureItem).toHaveBeenCalledWith(ADMIN_TOKEN_KEY);
  });

  it('keeps a genuine JWT-shaped admin token', async () => {
    vi.mocked(preferences.removeSecureItem).mockResolvedValue(undefined);
    vi.mocked(preferences.getSecureItem).mockResolvedValue('aaa.bbb.ccc');

    await purgeLegacyPlaintextCredentials();
    expect(preferences.removeSecureItem).not.toHaveBeenCalledWith(ADMIN_TOKEN_KEY);
  });

  it('unlock flag is in-memory and toggles', () => {
    setAdminBiometricUnlocked(false);
    expect(isAdminBiometricUnlocked()).toBe(false);
    setAdminBiometricUnlocked(true);
    expect(isAdminBiometricUnlocked()).toBe(true);
    setAdminBiometricUnlocked(false);
  });
});
