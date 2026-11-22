import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { isUserAdmin } from '@/constants/auth';
import { invalidateFetchCache } from '@/lib/api';
import { clearPendingOrders } from '@/lib/pendingOrdersQueue';
import { deleteCustomerBiometricCredentials } from '@/services/authService';

const MAX_BATCH_DELETE_OPS = 450;

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
  if (list.includes('google.com')) {
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
  dbInstance?: Firestore;
  onCleanupLocalCache?: () => Promise<void>;
}

export interface AccountDeletionDeps {
  reauthenticate: typeof reauthenticateWithCredential;
  reauthenticateWithGoogle: (user: User) => Promise<unknown>;
  reauthenticateWithProviderId: (user: User, providerId: string) => Promise<unknown>;
  buildCredential: typeof EmailAuthProvider.credential;
  removeAuthUser: typeof deleteUser;
  signOutAuth: typeof signOut;
  docRef: typeof doc;
  collectionRef: typeof collection;
  whereClause: typeof where;
  buildQuery: typeof query;
  fetchDocs: typeof getDocs;
  createWriteBatch: typeof writeBatch;
  clearBiometrics: typeof deleteCustomerBiometricCredentials;
  clearFetchCache: typeof invalidateFetchCache;
  clearQueuedOrders: typeof clearPendingOrders;
}

const defaultDeps: AccountDeletionDeps = {
  reauthenticate: reauthenticateWithCredential,
  reauthenticateWithGoogle: (user: User) =>
    reauthenticateWithPopup(user, new GoogleAuthProvider()),
  reauthenticateWithProviderId: (user: User, providerId: string) =>
    reauthenticateWithPopup(user, new OAuthProvider(providerId)),
  buildCredential: EmailAuthProvider.credential,
  removeAuthUser: deleteUser,
  signOutAuth: signOut,
  docRef: doc,
  collectionRef: collection,
  whereClause: where,
  buildQuery: query,
  fetchDocs: getDocs,
  createWriteBatch: writeBatch,
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

async function collectOwnedDocRefs(
  dbInstance: Firestore,
  collectionName: 'calendar_notes' | 'company_presets',
  uid: string,
  deps: AccountDeletionDeps
): Promise<DocumentReference[]> {
  const col = deps.collectionRef(dbInstance, collectionName);
  const ownedQuery = deps.buildQuery(col, deps.whereClause('userId', '==', uid));
  const snapshot = await deps.fetchDocs(ownedQuery);
  return snapshot.docs.map((item) => item.ref);
}

async function commitAtomicBatchDeletes(
  dbInstance: Firestore,
  refs: DocumentReference[],
  deps: AccountDeletionDeps
): Promise<void> {
  for (let i = 0; i < refs.length; i += MAX_BATCH_DELETE_OPS) {
    const chunk = refs.slice(i, i + MAX_BATCH_DELETE_OPS);
    const batch = deps.createWriteBatch(dbInstance);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
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
  const dbInstance = options.dbInstance ?? db;
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

  // Delete personal Firestore records in an atomic batch BEFORE deleting the Auth
  // user so firestore.rules (`request.auth.uid == uid`) still authorize cleanup
  // and no partial cleanup occurs on connection drop.
  try {
    const [calendarNoteRefs, companyPresetRefs] = await Promise.all([
      collectOwnedDocRefs(dbInstance, 'calendar_notes', user.uid, deps),
      collectOwnedDocRefs(dbInstance, 'company_presets', user.uid, deps),
    ]);
    const userDocRef = deps.docRef(dbInstance, 'users', user.uid);
    await commitAtomicBatchDeletes(
      dbInstance,
      [...calendarNoteRefs, ...companyPresetRefs, userDocRef],
      deps
    );
  } catch (err) {
    const mappedCode = mapFirebaseErrorToCode(err);
    throw new AccountDeletionError(
      mappedCode,
      err instanceof Error ? err.message : 'Failed to erase personal cloud data.'
    );
  }

  try {
    await deps.removeAuthUser(user);
  } catch (err) {
    const mappedCode = mapFirebaseErrorToCode(err);
    throw new AccountDeletionError(
      mappedCode,
      err instanceof Error ? err.message : 'Failed to delete Firebase Auth account.'
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
