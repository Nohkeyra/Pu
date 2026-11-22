import {
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithCredential,
  signInWithPopup,
  type AuthCredential,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isNative } from '@/firebaseConfig';

type Language = 'bm' | 'en';
type GoogleAction = 'signin' | 'link';

const googleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
};

function authError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

export function isGoogleLinked(user: User | null): boolean {
  return Boolean(user?.providerData?.some((provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID));
}

/**
 * Android: only use Capawesome to open the native Google account picker and obtain
 * an OAuth ID token. The existing Firebase JS Auth session is the single source of
 * truth for Firestore listeners, permissions, and /users/{uid} data.
 *
 * Do NOT call FirebaseAuthentication.linkWithGoogle(): email/password sign-in in
 * Wawasan uses Firebase JS Auth, so there is no corresponding native Auth user.
 * Do NOT use native Firebase sign-in here (skipNativeAuth: true), as it would create
 * a second, unsynchronised Firebase Auth session on Android.
 */
async function getNativeGoogleCredential(): Promise<AuthCredential> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
  const idToken = result.credential?.idToken;
  if (!idToken) {
    throw authError('auth/missing-google-id-token', 'Google did not return an ID token.');
  }
  return GoogleAuthProvider.credential(idToken);
}

/** Sign in via web popup or native Android picker; never merge accounts by email. */
export async function signInWithGoogle(): Promise<{ user: User; profileReady: boolean }> {
  if (auth.currentUser) {
    // A signed-in password user must link Google, never replace their session.
    throw authError('auth/already-authenticated', 'Link Google from Settings while signed in.');
  }

  let user: User;
  if (isNative) {
    const credential = await getNativeGoogleCredential();
    // Refuse to switch identities if another login completed while the picker was open.
    if (auth.currentUser) {
      throw authError('auth/already-authenticated', 'The authentication session changed.');
    }
    user = (await signInWithCredential(auth, credential)).user;
  } else {
    // Launch immediately on the button click before any asynchronous preparation.
    user = (await signInWithPopup(auth, googleProvider())).user;
  }

  // Only create a minimal document for a new UID. Never replace an existing
  // email/password user's profile, orders, or history.
  let profileReady = true;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);
    if (!existing.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        contact: '',
        to: '',
        attn: '',
        department: '',
        division: '',
        initials: '',
        initialIdentifier: '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (error) {
    // Authentication succeeded even if an offline Firestore request fails.
    profileReady = false;
    console.warn('Google sign-in succeeded; profile sync was unavailable:', error);
  }

  return { user, profileReady };
}

/**
 * Manual linking is the only permitted way to attach Google to an existing
 * email/password UID. On Android, the native token is linked on the JS layer.
 * No Firestore migration, new UID, or automatic account merge occurs.
 */
export async function linkCurrentUserWithGoogle(): Promise<User> {
  const originalUser = auth.currentUser;
  if (!originalUser) {
    throw authError('auth/requires-login', 'Sign in before linking Google.');
  }
  if (isGoogleLinked(originalUser)) return originalUser;

  let linkedUser: User;
  if (isNative) {
    const credential = await getNativeGoogleCredential();
    // An account change during the native picker must never link the wrong UID.
    if (auth.currentUser?.uid !== originalUser.uid) {
      throw authError('auth/user-changed-during-link', 'The signed-in account changed while linking.');
    }
    linkedUser = (await linkWithCredential(originalUser, credential)).user;
  } else {
    linkedUser = (await linkWithPopup(originalUser, googleProvider())).user;
  }

  if (linkedUser.uid !== originalUser.uid) {
    throw authError('auth/uid-mismatch', 'Linked user UID did not match the existing account.');
  }
  return linkedUser;
}

/** Browser popup dismissal or native Android account-picker cancellation. */
export function isGooglePopupDismissed(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'auth/popup-closed-by-user'
    || code === 'auth/cancelled-popup-request'
    || code === 'SIGN_IN_CANCELLED'
    || code === 'SIGN_IN_CANCELED'
    || code === 'auth/user-cancelled'
    || code === 'auth/user-canceled';
}

export function googleAuthErrorMessage(error: unknown, language: Language, action: GoogleAction): string {
  const rawCode = (error as { code?: string | number } | null)?.code;
  const code = rawCode == null ? '' : String(rawCode);
  const bm = language === 'bm';
  switch (code) {
    case 'auth/account-exists-with-different-credential':
      return bm
        ? 'E-mel ini sudah didaftarkan menggunakan kata laluan. Log masuk dengan e-mel dan kata laluan dahulu, kemudian pilih “Hubungkan ke Akaun Google” di Tetapan.'
        : 'This email already uses a password account. Sign in with your email and password first, then choose “Connect to Google” in Settings.';
    case 'auth/credential-already-in-use':
    case 'auth/email-already-in-use':
      return bm
        ? 'Akaun Google ini sudah digunakan oleh akaun lain. Pilih akaun Google yang berbeza; akaun tidak akan digabungkan secara automatik.'
        : 'This Google account belongs to another account. Choose a different Google account; accounts will not be merged automatically.';
    case 'auth/provider-already-linked':
      return bm ? 'Akaun Google sudah dihubungkan.' : 'Google is already connected.';
    case 'auth/already-authenticated':
      return bm ? 'Anda sudah log masuk. Hubungkan Google melalui Tetapan akaun, bukan melalui log masuk baharu.' : 'You are already signed in. Connect Google from Account Settings instead of starting a new sign-in.';
    case 'auth/requires-login':
      return bm ? 'Sila log masuk dengan e-mel dan kata laluan terlebih dahulu.' : 'Please sign in with email and password first.';
    case 'auth/requires-recent-login':
      return bm ? 'Sila log keluar dan log masuk semula sebelum menghubungkan Google.' : 'Sign out and sign in again before connecting Google.';
    case 'auth/user-changed-during-link':
    case 'auth/uid-mismatch':
      return bm ? 'Sesi akaun telah berubah. Tiada akaun dihubungkan; sila log masuk semula.' : 'Your account session changed. No account was linked; please sign in again.';
    case 'auth/popup-blocked':
      return bm ? 'Pelayar menyekat tetingkap Google. Benarkan pop-up untuk laman ini dan cuba lagi.' : 'Your browser blocked the Google popup. Allow popups for this site and try again.';
    case 'auth/unauthorized-domain':
      return bm ? 'Domain web ini belum dibenarkan dalam Firebase Authentication.' : 'This website domain is not authorized in Firebase Authentication.';
    case 'auth/operation-not-allowed':
      return bm ? 'Google Sign-In belum diaktifkan dalam Firebase Authentication.' : 'Google Sign-In is not enabled in Firebase Authentication.';
    case 'DEVELOPER_ERROR':
    case '10':
    case 'auth/configuration-not-found':
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized':
      return bm
        ? 'Google Sign-In tidak tersedia kerana konfigurasi aplikasi Android belum lengkap. Sila gunakan e-mel dan kata laluan sementara pentadbir menyemak Firebase dan sijil APK.'
        : 'Google Sign-In is unavailable due to an Android app configuration issue. Please use email/password while support checks Firebase and the APK signing certificate.';
    case 'auth/missing-google-id-token':
    case 'auth/invalid-credential':
      return bm ? 'Pengesahan Google tidak lengkap. Sila cuba lagi atau hubungi pentadbir aplikasi.' : 'Google authentication was incomplete. Try again or contact support.';
    case 'auth/network-request-failed':
      return bm ? 'Sambungan internet terputus. Sila cuba semula.' : 'Network connection failed. Please try again.';
    default:
      return bm
        ? `Tidak dapat ${action === 'link' ? 'menghubungkan akaun Google' : 'log masuk dengan Google'}. Sila cuba lagi.`
        : `Could not ${action === 'link' ? 'connect your Google account' : 'sign in with Google'}. Please try again.`;
  }
}
