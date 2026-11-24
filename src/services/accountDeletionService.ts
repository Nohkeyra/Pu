import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { auth, isNative } from '@/firebaseConfig';
import { getNativeGoogleCredential } from '@/services/googleAuthService';
import { isUserAdmin } from '@/constants/auth';
import { getApiUrl, invalidateFetchCache } from '@/lib/api';
import { clearPendingOrders } from '@/lib/pendingOrdersQueue';
import { deleteCustomerBiometricCredentials } from '@/services/authService';

export type AccountDeletionErrorCode =
  | 'ACCOUNT_NOT_SIGNED_IN'
  | 'ADMIN_ACCOUNT_PROTECTED'
  | 'MISSING_EMAIL'
  | 'PASSWORD_REQUIRED'
  | 'INVALID_PASSWORD'
  | 'UNSUPPORTED_AUTH_PROVIDER'
  | 'REAUTH_CANCELLED'
  | 'REAUTH_MISMATCH'
  | 'TOO_MANY_REQUESTS'
  | 'NETWORK_ERROR'
  | 'DELETE_FAILED';

export class AccountDeletionError extends Error {
  readonly code: AccountDeletionErrorCode;

  constructor(code: AccountDeletionErrorCode, message: string) {
    super(message);
    this.name = 'AccountDeletionError';
    this.code = code;
  }
}

export type ReauthStrategy =
  | { kind: 'password' }
  | { kind: 'google' }
  | { kind: 'federated'; providerId: string }
  | { kind: 'unsupported'; providerId: string };

export function resolveReauthStrategy(providerIds?: string[]): ReauthStrategy {
  const list = Array.isArray(providerIds) ? providerIds.filter(Boolean) : [];
  if (list.length === 0 || list.includes('password')) {
    return { kind: 'password' };
  }
  if (list.some((id) => id === 'google.com')) {
    return { kind: 'google' };
  }
  const federatedProviderId = list.find(
    (id) => id !== 'phone' && id !== 'anonymous'
  );
  if (federatedProviderId) {
    return { kind: 'federated', providerId: federatedProviderId };
  }
  return { kind: 'unsupported', providerId: list[0] || 'unknown' };
}

export interface DeleteCustomerAccountOptions {
  password: string;
  isAdminSession?: boolean;
  authInstance?: Auth;
  onCleanupLocalCache?: () => Promise<void>;
}

export interface AccountDeletionDeps {
  reauthenticate: typeof reauthenticateWithCredential;
  reauthenticateWithGoogle: (user: User) => Promise<unknown>;
  reauthenticateWithProviderId: (user: User, providerId: string) => Promise<unknown>;
  buildCredential: typeof EmailAuthProvider.credential;
  deleteAccountOnServer: (user: User) => Promise<void>;
  signOutAuth: typeof signOut;
  clearBiometrics: typeof deleteCustomerBiometricCredentials;
  clearFetchCache: typeof invalidateFetchCache;
  clearQueuedOrders: typeof clearPendingOrders;
}

const defaultDeps: AccountDeletionDeps = {
  reauthenticate: reauthenticateWithCredential,
  reauthenticateWithGoogle: async (user: User) =>
    isNative ? reauthenticateWithCredential(user, await getNativeGoogleCredential())
      : reauthenticateWithPopup(user, new GoogleAuthProvider()),
  reauthenticateWithProviderId: (user: User, providerId: string) =>
    reauthenticateWithPopup(user, new OAuthProvider(providerId)),
  buildCredential: EmailAuthProvider.credential,
  deleteAccountOnServer: async (user: User) => {
    const token = await user.getIdToken(true);
    const response = await fetch(getApiUrl('/api/user/delete-account'), {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60_000),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error(result.error || 'Account deletion failed.');
  },
  signOutAuth: signOut,
  clearBiometrics: deleteCustomerBiometricCredentials,
  clearFetchCache: invalidateFetchCache,
  clearQueuedOrders: clearPendingOrders,
};

function mapFirebaseErrorToCode(error: unknown): AccountDeletionErrorCode {
  const code =
    typeof error === 'object' && error !== null
      ? (error as { code?: string }).code
      : undefined;
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'INVALID_PASSWORD';
    case 'auth/too-many-requests':
      return 'TOO_MANY_REQUESTS';
    case 'auth/network-request-failed':
      return 'NETWORK_ERROR';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'REAUTH_CANCELLED';
    case 'auth/user-mismatch':
      return 'REAUTH_MISMATCH';
    default:
      return 'DELETE_FAILED';
  }
}

function clearLocalCustomerStorage(clearQueuedOrders: typeof clearPendingOrders): void {
  try {
    sessionStorage.removeItem('wawasan_session_started');
    sessionStorage.removeItem('wawasan_guest_allowed');
  } catch {
    // Session storage may be unavailable in restricted contexts
  }
  try {
    localStorage.removeItem('wawasan_fcm_token');
    localStorage.removeItem('wawasan_device_token');
    localStorage.removeItem('wawasan_read_notifications');
    localStorage.removeItem('wawasan_order_draft_step');
    localStorage.removeItem('wawasan_order_draft_state');
    localStorage.removeItem('wawasan_order_draft');
  } catch {
    // Local storage may be unavailable in restricted contexts
  }
  try {
    clearQueuedOrders();
  } catch {
    // Pending order storage may be unavailable in restricted contexts
  }
}

async function clearAppCachesBestEffort(): Promise<void> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.onLine &&
      typeof window !== 'undefined' &&
      'caches' in window
    ) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.filter((key) => key.startsWith('wawasan-')).map((key) => caches.delete(key))
      );
    }
  } catch {
    // Cache cleanup should not block post-deletion completion
  }
}

export async function deleteCustomerAccountAndData(
  options: DeleteCustomerAccountOptions,
  deps: AccountDeletionDeps = defaultDeps
): Promise<void> {
  const authInstance = options.authInstance ?? auth;
  const user: User | null = authInstance.currentUser;

  if (!user) {
    throw new AccountDeletionError('ACCOUNT_NOT_SIGNED_IN', 'No signed-in customer account found.');
  }

  if (options.isAdminSession || user.uid === 'admin' || isUserAdmin(user.email)) {
    throw new AccountDeletionError(
      'ADMIN_ACCOUNT_PROTECTED',
      'Administrator accounts cannot be deleted from customer settings.'
    );
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new AccountDeletionError(
      'NETWORK_ERROR',
      'An active internet connection is required to delete your account.'
    );
  }

  const providerIds = Array.isArray(user.providerData)
    ? user.providerData.map((provider) => provider.providerId)
    : [];
  const strategy = resolveReauthStrategy(providerIds);

  if (strategy.kind === 'password') {
    if (!user.email) {
      throw new AccountDeletionError(
        'MISSING_EMAIL',
        'Signed-in account is missing an email address.'
      );
    }
    if (!options.password) {
      throw new AccountDeletionError('PASSWORD_REQUIRED', 'Password confirmation is required.');
    }

    try {
      const credential = deps.buildCredential(user.email, options.password);
      await deps.reauthenticate(user, credential);
    } catch (err) {
      const mappedCode = mapFirebaseErrorToCode(err);
      throw new AccountDeletionError(
        mappedCode,
        err instanceof Error ? err.message : 'Re-authentication failed.'
      );
    }
  } else if (strategy.kind === 'google') {
    try {
      await deps.reauthenticateWithGoogle(user);
    } catch (err) {
      const mappedCode = mapFirebaseErrorToCode(err);
      throw new AccountDeletionError(
        mappedCode,
        err instanceof Error ? err.message : 'Google re-authentication failed.'
      );
    }
  } else if (strategy.kind === 'federated') {
    try {
      await deps.reauthenticateWithProviderId(user, strategy.providerId);
    } catch (err) {
      const mappedCode = mapFirebaseErrorToCode(err);
      throw new AccountDeletionError(
        mappedCode,
        err instanceof Error ? err.message : 'Federated re-authentication failed.'
      );
    }
  } else {
    throw new AccountDeletionError(
      'UNSUPPORTED_AUTH_PROVIDER',
      'This account sign-in method requires support assistance for deletion.'
    );
  }

  if (authInstance.currentUser?.uid !== user.uid)
    throw new AccountDeletionError('REAUTH_MISMATCH', 'The signed-in account changed.');
  try {
    await deps.deleteAccountOnServer(user);
  } catch (err) {
    throw new AccountDeletionError(
      mapFirebaseErrorToCode(err),
      err instanceof Error ? err.message : 'Failed to delete account. Please retry.'
    );
  }

  // Best-effort device cleanup after permanent server/auth deletion succeeds.
  await deps.clearBiometrics().catch(() => false);
  clearLocalCustomerStorage(deps.clearQueuedOrders);
  deps.clearFetchCache();
  await clearAppCachesBestEffort();
  if (options.onCleanupLocalCache) {
    await options.onCleanupLocalCache().catch(() => undefined);
  }
  await deps.signOutAuth(authInstance).catch(() => undefined);
}
