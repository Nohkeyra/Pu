import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { linkWithCredential, signInWithCredential } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';
import { auth } from '@/firebaseConfig';
import {
  googleAuthErrorMessage,
  isGoogleLinked,
  linkCurrentUserWithGoogle,
  signInWithGoogle,
} from './googleAuthService';

vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: { signInWithGoogle: vi.fn() },
}));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    static PROVIDER_ID = 'google.com';
    static credential = vi.fn((idToken: string) => ({ providerId: 'google.com', idToken }));
    setCustomParameters = vi.fn();
  },
  signInWithCredential: vi.fn(),
  linkWithCredential: vi.fn(),
  signInWithPopup: vi.fn(),
  linkWithPopup: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, collection, uid) => `${collection}/${uid}`),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));
vi.mock('@/firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
  isNative: true,
}));

const originalUser = {
  uid: 'uid-email-original',
  email: 'pelanggan@example.com',
  displayName: 'Pelanggan',
  providerData: [{ providerId: 'password' }],
};

const linkedUser = {
  ...originalUser,
  providerData: [{ providerId: 'password' }, { providerId: 'google.com' }],
};

const nativeGoogle = vi.mocked(FirebaseAuthentication.signInWithGoogle);

describe('Native Android Google Auth with JS Firebase as the single session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(auth, { currentUser: null });
    nativeGoogle.mockResolvedValue({ credential: { idToken: 'google-token' } } as never);
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true } as never);
  });

  it('signs in on Firebase JS Auth using a credential from the native account picker', async () => {
    vi.mocked(signInWithCredential).mockResolvedValue({ user: originalUser } as never);

    const result = await signInWithGoogle();

    expect(nativeGoogle).toHaveBeenCalledWith({ skipNativeAuth: true });
    expect(signInWithCredential).toHaveBeenCalledWith(auth, {
      providerId: 'google.com', idToken: 'google-token',
    });
    expect(result.user.uid).toBe(originalUser.uid);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('links Google on the already signed-in JS user and preserves the original UID', async () => {
    Object.assign(auth, { currentUser: originalUser });
    vi.mocked(linkWithCredential).mockResolvedValue({ user: linkedUser } as never);

    const result = await linkCurrentUserWithGoogle();

    expect(nativeGoogle).toHaveBeenCalledWith({ skipNativeAuth: true });
    expect(linkWithCredential).toHaveBeenCalledWith(originalUser, {
      providerId: 'google.com', idToken: 'google-token',
    });
    expect(result.uid).toBe(originalUser.uid);
    expect(isGoogleLinked(result)).toBe(true);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('does not reopen the native picker when the provider is already linked', async () => {
    Object.assign(auth, { currentUser: linkedUser });
    expect(await linkCurrentUserWithGoogle()).toBe(linkedUser);
    expect(nativeGoogle).not.toHaveBeenCalled();
  });

  it('rejects a native result without an ID token', async () => {
    Object.assign(auth, { currentUser: originalUser });
    nativeGoogle.mockResolvedValue({ credential: {} } as never);
    await expect(linkCurrentUserWithGoogle()).rejects.toMatchObject({ code: 'auth/missing-google-id-token' });
    expect(linkWithCredential).not.toHaveBeenCalled();
  });

  it('does not link Google to a different user if the login session changes in the picker', async () => {
    Object.assign(auth, { currentUser: originalUser });
    nativeGoogle.mockImplementation(async () => {
      Object.assign(auth, { currentUser: { ...originalUser, uid: 'another-uid' } });
      return { credential: { idToken: 'google-token' } } as never;
    });
    await expect(linkCurrentUserWithGoogle()).rejects.toMatchObject({ code: 'auth/user-changed-during-link' });
    expect(linkWithCredential).not.toHaveBeenCalled();
  });

  it('preserves and explains account-conflict errors without automatically merging users', async () => {
    const conflict = { code: 'auth/account-exists-with-different-credential' };
    vi.mocked(signInWithCredential).mockRejectedValue(conflict);
    await expect(signInWithGoogle()).rejects.toEqual(conflict);
    expect(googleAuthErrorMessage(conflict, 'bm', 'signin')).toContain('kata laluan');
    expect(linkWithCredential).not.toHaveBeenCalled();
  });
});
