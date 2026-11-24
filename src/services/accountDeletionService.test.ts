import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@capacitor-community/native-biometric', () => ({
  NativeBiometric: {
    isAvailable: vi.fn(),
    verifyIdentity: vi.fn(),
    getCredentials: vi.fn(),
    setCredentials: vi.fn(),
    deleteCredentials: vi.fn(),
  },
  BiometryType: { NONE: 0 },
}));

vi.mock('@/firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
}));

import {
  AccountDeletionError,
  deleteCustomerAccountAndData,
  type AccountDeletionDeps,
} from './accountDeletionService';

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

function createDeps(overrides: Partial<AccountDeletionDeps> = {}): AccountDeletionDeps {
  return {
    reauthenticate: vi.fn(async () => ({} as never)),
    reauthenticateWithGoogle: vi.fn(async () => ({} as never)),
    reauthenticateWithProviderId: vi.fn(async () => ({} as never)),
    buildCredential: vi.fn((email, password) => ({ email, password } as never)),
    deleteAccountOnServer: vi.fn(async () => undefined),
    signOutAuth: vi.fn(async () => undefined),
    clearBiometrics: vi.fn(async () => true),
    clearFetchCache: vi.fn(() => undefined),
    clearQueuedOrders: vi.fn(() => undefined),
    ...overrides,
  };
}

describe('deleteCustomerAccountAndData', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createStorageMock());
    vi.stubGlobal('localStorage', createStorageMock());
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects when no user is signed in', async () => {
    const deps = createDeps();
    await expect(
      deleteCustomerAccountAndData(
        {
          password: 'secret',
          authInstance: { currentUser: null } as never,
        },
        deps
      )
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_SIGNED_IN' });
    expect(deps.reauthenticate).not.toHaveBeenCalled();
  });

  it('protects admin accounts from customer account deletion', async () => {
    const deps = createDeps();

    await expect(
      deleteCustomerAccountAndData(
        {
          password: 'secret',
          isAdminSession: true,
          authInstance: { currentUser: { uid: 'cust_1', email: 'cust@example.com' } } as never,
        },
        deps
      )
    ).rejects.toMatchObject({ code: 'ADMIN_ACCOUNT_PROTECTED' });

    await expect(
      deleteCustomerAccountAndData(
        {
          password: 'secret',
          authInstance: { currentUser: { uid: 'admin', email: 'wawasan.orders@gmail.com' } } as never,
        },
        deps
      )
    ).rejects.toMatchObject({ code: 'ADMIN_ACCOUNT_PROTECTED' });

    expect(deps.deleteAccountOnServer).not.toHaveBeenCalled();

  });

  it('fails fast with NETWORK_ERROR when device is offline without touching Firestore or Auth', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const deps = createDeps();

    await expect(
      deleteCustomerAccountAndData(
        {
          password: 'MyStrongPassword!1',
          authInstance: { currentUser: { uid: 'cust_1', email: 'cust@example.com' } } as never,
        },
        deps
      )
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    expect(deps.reauthenticate).not.toHaveBeenCalled();


    expect(deps.deleteAccountOnServer).not.toHaveBeenCalled();
  });

  it('requires password confirmation before re-authenticating password accounts', async () => {
    const deps = createDeps();
    await expect(
      deleteCustomerAccountAndData(
        {
          password: '',
          authInstance: {
            currentUser: {
              uid: 'cust_1',
              email: 'cust@example.com',
              providerData: [{ providerId: 'password' }],
            },
          } as never,
        },
        deps
      )
    ).rejects.toMatchObject({ code: 'PASSWORD_REQUIRED' });
  });

  it('maps invalid password errors cleanly and does not delete Firestore or Auth', async () => {
    const deps = createDeps({
      reauthenticate: vi.fn(async () => {
        throw Object.assign(new Error('Invalid credential'), { code: 'auth/invalid-credential' });
      }),
    });

    await expect(
      deleteCustomerAccountAndData(
        {
          password: 'wrong-password',
          authInstance: {
            currentUser: {
              uid: 'cust_1',
              email: 'cust@example.com',
              providerData: [{ providerId: 'password' }],
            },
          } as never,
        },
        deps
      )
    ).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });

    expect(deps.deleteAccountOnServer).not.toHaveBeenCalled();
    expect(deps.clearBiometrics).not.toHaveBeenCalled();
  });

  it('supports Google-only accounts via Google re-authentication popup without a password', async () => {
    const deps = createDeps();
    await deleteCustomerAccountAndData(
      {
        password: '',
        authInstance: {
          currentUser: {
            uid: 'google_cust_1',
            email: 'googleuser@example.com',
            providerData: [{ providerId: 'google.com' }],
          },
        } as never,
      },
      deps
    );

    expect(deps.reauthenticateWithGoogle).toHaveBeenCalledTimes(1);
    expect(deps.reauthenticate).not.toHaveBeenCalled();

    expect(deps.deleteAccountOnServer).toHaveBeenCalledTimes(1);
  });

  it('supports other federated OAuth providers (e.g. apple.com) via OAuthProvider popup', async () => {
    const deps = createDeps();
    await deleteCustomerAccountAndData(
      {
        password: '',
        authInstance: {
          currentUser: {
            uid: 'apple_cust_1',
            email: 'appleuser@example.com',
            providerData: [{ providerId: 'apple.com' }],
          },
        } as never,
      },
      deps
    );

    expect(deps.reauthenticateWithProviderId).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'apple_cust_1' }),
      'apple.com'
    );
    expect(deps.reauthenticateWithGoogle).not.toHaveBeenCalled();

    expect(deps.deleteAccountOnServer).toHaveBeenCalledTimes(1);
  });

  it('maps cancelled and mismatched popup re-authentication errors cleanly', async () => {
    const cancelledDeps = createDeps({
      reauthenticateWithGoogle: vi.fn(async () => {
        throw Object.assign(new Error('Popup closed'), { code: 'auth/popup-closed-by-user' });
      }),
    });

    await expect(
      deleteCustomerAccountAndData(
        {
          password: '',
          authInstance: {
            currentUser: {
              uid: 'google_cust_1',
              email: 'googleuser@example.com',
              providerData: [{ providerId: 'google.com' }],
            },
          } as never,
        },
        cancelledDeps
      )
    ).rejects.toMatchObject({ code: 'REAUTH_CANCELLED' });

    const mismatchDeps = createDeps({
      reauthenticateWithGoogle: vi.fn(async () => {
        throw Object.assign(new Error('Mismatch'), { code: 'auth/user-mismatch' });
      }),
    });

    await expect(
      deleteCustomerAccountAndData(
        {
          password: '',
          authInstance: {
            currentUser: {
              uid: 'google_cust_1',
              email: 'googleuser@example.com',
              providerData: [{ providerId: 'google.com' }],
            },
          } as never,
        },
        mismatchDeps
      )
    ).rejects.toMatchObject({ code: 'REAUTH_MISMATCH' });

    expect(cancelledDeps.deleteAccountOnServer).not.toHaveBeenCalled();
    expect(mismatchDeps.deleteAccountOnServer).not.toHaveBeenCalled();
  });

  it('rejects unsupported sign-in providers (e.g. phone or anonymous) cleanly without touching data', async () => {
    const deps = createDeps();
    await expect(
      deleteCustomerAccountAndData(
        {
          password: '',
          authInstance: {
            currentUser: {
              uid: 'phone_cust_1',
              email: null,
              providerData: [{ providerId: 'phone' }],
            },
          } as never,
        },
        deps
      )
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_AUTH_PROVIDER' });

    expect(deps.deleteAccountOnServer).not.toHaveBeenCalled();
  });

  it('does not clear local data or sign out when server deletion fails', async () => {
    const deps = createDeps({ deleteAccountOnServer: vi.fn(async () => { throw new Error('Server unavailable'); }) });
    await expect(deleteCustomerAccountAndData({
      password: 'correct-password',
      authInstance: { currentUser: { uid: 'cust_1', email: 'cust@example.com' } } as never,
    }, deps)).rejects.toBeInstanceOf(AccountDeletionError);
    expect(deps.clearBiometrics).not.toHaveBeenCalled();
    expect(deps.signOutAuth).not.toHaveBeenCalled();
  });

  it('re-authenticates, confirms server deletion, then clears all local/draft/biometric data', async () => {
    const callOrder: string[] = [];
    sessionStorage.setItem('wawasan_session_started', 'true');
    sessionStorage.setItem('wawasan_guest_allowed', 'true');
    localStorage.setItem('wawasan_fcm_token', 'token-123');
    localStorage.setItem('wawasan_device_token', 'dev-123');
    localStorage.setItem('wawasan_read_notifications', '["n1"]');
    localStorage.setItem('wawasan_order_draft_step', '3');
    localStorage.setItem('wawasan_order_draft_state', '{"name":"Ali"}');
    localStorage.setItem('wawasan_order_draft', '{"name":"Ali"}');

    const user = {
      uid: 'cust_123',
      email: 'pelanggan@example.com',
      providerData: [{ providerId: 'password' }],
    };

    const deps = createDeps({
      reauthenticate: vi.fn(async () => {
        callOrder.push('reauthenticate');
        return {} as never;
      }),
      deleteAccountOnServer: vi.fn(async () => { callOrder.push('deleteAccountOnServer'); }),
      clearBiometrics: vi.fn(async () => {
        callOrder.push('clearBiometrics');
        return true;
      }),
      clearQueuedOrders: vi.fn(() => {
        callOrder.push('clearQueuedOrders');
      }),
      clearFetchCache: vi.fn(() => {
        callOrder.push('clearFetchCache');
      }),
      signOutAuth: vi.fn(async () => {
        callOrder.push('signOutAuth');
      }),
    });

    await deleteCustomerAccountAndData(
      {
        password: 'MyStrongPassword!1',
        authInstance: { currentUser: user } as never,
      },
      deps
    );

    expect(callOrder).toEqual([
      'reauthenticate',
      'deleteAccountOnServer',
      'clearBiometrics',
      'clearQueuedOrders',
      'clearFetchCache',
      'signOutAuth',
    ]);

    expect(sessionStorage.getItem('wawasan_session_started')).toBeNull();
    expect(sessionStorage.getItem('wawasan_guest_allowed')).toBeNull();
    expect(localStorage.getItem('wawasan_fcm_token')).toBeNull();
    expect(localStorage.getItem('wawasan_device_token')).toBeNull();
    expect(localStorage.getItem('wawasan_read_notifications')).toBeNull();
    expect(localStorage.getItem('wawasan_order_draft_step')).toBeNull();
    expect(localStorage.getItem('wawasan_order_draft_state')).toBeNull();
    expect(localStorage.getItem('wawasan_order_draft')).toBeNull();
  });
});
