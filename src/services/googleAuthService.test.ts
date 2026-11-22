import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDoc, setDoc } from 'firebase/firestore';
import { linkWithPopup, signInWithPopup } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import {
  googleAuthErrorMessage,
  isGoogleLinked,
  isGooglePopupDismissed,
  linkCurrentUserWithGoogle,
  signInWithGoogle,
} from './googleAuthService';

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    static PROVIDER_ID = 'google.com';
    setCustomParameters = vi.fn();
  },
  linkWithPopup: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithCredential: vi.fn(),
  linkWithCredential: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, collection, uid) => `${collection}/${uid}`),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));
vi.mock('@/firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {},
  isNative: false,
}));

const existingUser = {
  uid: 'original-uid',
  email: 'example@wawasan.my',
  displayName: 'Pengguna',
  providerData: [{ providerId: 'password' }],
};

describe('Google authentication and manual linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(auth, { currentUser: null });
  });

  it('creates a minimal customer profile only when the Google UID is new', async () => {
    vi.mocked(signInWithPopup).mockResolvedValue({ user: existingUser } as never);
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
    vi.mocked(setDoc).mockResolvedValue(undefined);

    const result = await signInWithGoogle();
    expect(result.user.uid).toBe('original-uid');
    expect(result.profileReady).toBe(true);
    expect(setDoc).toHaveBeenCalledWith('users/original-uid', expect.objectContaining({
      uid: 'original-uid', email: 'example@wawasan.my', contact: '',
    }), { merge: true });
  });

  it('does not overwrite the existing Firestore customer profile', async () => {
    vi.mocked(signInWithPopup).mockResolvedValue({ user: existingUser } as never);
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true } as never);

    await signInWithGoogle();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('links Google using the signed-in account and preserves the UID', async () => {
    Object.assign(auth, { currentUser: existingUser });
    vi.mocked(linkWithPopup).mockResolvedValue({
      user: { ...existingUser, providerData: [{ providerId: 'google.com' }] },
    } as never);

    const linkedUser = await linkCurrentUserWithGoogle();
    expect(linkWithPopup).toHaveBeenCalledWith(existingUser, expect.anything());
    expect(linkedUser.uid).toBe(existingUser.uid);
    expect(isGoogleLinked(linkedUser)).toBe(true);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('does not switch away from an existing email/password session', async () => {
    Object.assign(auth, { currentUser: existingUser });
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'auth/already-authenticated' });
    expect(signInWithPopup).not.toHaveBeenCalled();
  });

  it('rejects linking if no one is signed in', async () => {
    await expect(linkCurrentUserWithGoogle()).rejects.toMatchObject({ code: 'auth/requires-login' });
    expect(linkWithPopup).not.toHaveBeenCalled();
  });

  it('surfaces the existing-email conflict without an automatic account merge', async () => {
    const error = { code: 'auth/account-exists-with-different-credential' };
    vi.mocked(signInWithPopup).mockRejectedValue(error);

    await expect(signInWithGoogle()).rejects.toEqual(error);
    expect(googleAuthErrorMessage(error, 'bm', 'signin')).toContain('kata laluan');
    expect(googleAuthErrorMessage(error, 'bm', 'signin')).toContain('Hubungkan ke Akaun Google');
    expect(linkWithPopup).not.toHaveBeenCalled();
  });

  it('does not treat a deliberately closed popup as a failed login', () => {
    expect(isGooglePopupDismissed({ code: 'auth/popup-closed-by-user' })).toBe(true);
    expect(isGooglePopupDismissed({ code: 'auth/popup-blocked' })).toBe(false);
  });
});
