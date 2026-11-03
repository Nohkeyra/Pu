import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  signInWithCustomToken,
  type User 
} from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { getApiUrl } from '@/lib/api';
import {
  checkBiometricAvailability,
  authenticateAdminWithBiometrics,
  storeAdminBiometricCredentials,
  getAdminBiometricCredentials,
  deleteAdminBiometricCredentials,
  getStoredAdminToken,
  saveAdminToken,
  clearAdminSession,
  isAdminBiometricsEnabledOnDevice,
  isAdminBiometricUnlocked,
  setAdminBiometricUnlocked,
  isStaleCredentialError,
  ADMIN_RELOCK_AFTER_MS,
  type BiometricAvailability,
  type AdminAuthResult,
  type AdminBiometricAuthOptions,
} from '@/services/authService';
import { BiometryType } from '@capacitor-community/native-biometric';

export interface UseAdminBiometricOptions {
  autoRehydrate?: boolean;
}

export interface UseAdminBiometricReturn {
  // Biometric hardware & state
  isAvailable: boolean;
  biometryType: BiometryType | 'none' | 'unknown';
  isNative: boolean;
  hasAdminBiometrics: boolean;
  isCheckingBiometrics: boolean;

  // Session & Authentication state
  isAuthenticated: boolean;
  adminToken: string;
  user: User | null;
  isInitializing: boolean;
  isBiometricLoading: boolean;
  /** A verified admin session exists but is locked until the person passes the biometric prompt. */
  requiresBiometricUnlock: boolean;
  error: string;
  setError: (err: string) => void;

  // Authentication actions
  authenticateBiometric: (options?: AdminBiometricAuthOptions) => Promise<AdminAuthResult>;
  loginWithPassword: (email: string, password: string, enableBiometrics?: boolean) => Promise<AdminAuthResult>;
  storeBiometrics: (username: string, passwordOrToken: string) => Promise<boolean>;
  removeBiometrics: () => Promise<boolean>;
  logout: () => Promise<void>;
  rehydrateSession: () => Promise<boolean>;
  checkBiometrics: () => Promise<boolean>;
}

export function useAdminBiometric(options: UseAdminBiometricOptions = {}): UseAdminBiometricReturn {
  const { autoRehydrate = true } = options;

  // Biometric state
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType | 'none' | 'unknown'>('none');
  const [isNative, setIsNative] = useState(false);
  const [hasAdminBiometrics, setHasAdminBiometrics] = useState(false);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(true);

  // Session state
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [adminToken, setAdminToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isBiometricLoading, setIsBiometricLoading] = useState<boolean>(false);
  const [requiresBiometricUnlock, setRequiresBiometricUnlock] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const isVerifyingRef = useRef(false);

  /**
   * Check biometric hardware capability and whether user has enabled admin biometrics
   */
  const checkBiometrics = useCallback(async (): Promise<boolean> => {
    setIsCheckingBiometrics(true);
    try {
      const avail: BiometricAvailability = await checkBiometricAvailability();
      setIsAvailable(avail.isAvailable);
      setBiometryType(avail.biometryType);
      setIsNative(avail.isNative);

      const isEnabled = avail.isAvailable && (await isAdminBiometricsEnabledOnDevice());
      setHasAdminBiometrics(isEnabled);
      return isEnabled;
    } catch (err) {
      console.warn('[useAdminBiometric] Error checking biometrics:', err);
      setHasAdminBiometrics(false);
      return false;
    } finally {
      setIsCheckingBiometrics(false);
    }
  }, []);

  /**
   * Server-verifies the admin claim for a Firebase user. Returns the fresh ID
   * token, or null when the account is not an admin. Throws on network errors.
   */
  const verifyAdminUser = useCallback(async (fbUser: User): Promise<string | null> => {
    const idToken = await fbUser.getIdToken(true);
    const res = await fetch(getApiUrl('/api/admin/verify'), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    return res.ok ? idToken : null;
  }, []);

  /**
   * Single place that turns a server-verified admin session into UI state.
   * If this device has admin biometrics enabled, a verified session is NOT
   * enough: it stays locked until this app launch has passed a biometric (or
   * fresh password) check. This closes the old path where a persisted Firebase
   * session skipped the fingerprint entirely.
   */
  const admitSession = useCallback(async (idToken: string, fbUser: User | null): Promise<boolean> => {
    await saveAdminToken(idToken);
    if (fbUser) setUser(fbUser);

    const locked = !isAdminBiometricUnlocked() && (await isAdminBiometricsEnabledOnDevice());
    if (locked) {
      setAdminToken('');
      setIsAuthenticated(false);
      setRequiresBiometricUnlock(true);
      return false;
    }

    setAdminToken(idToken);
    setIsAuthenticated(true);
    setRequiresBiometricUnlock(false);
    setError('');
    return true;
  }, []);

  /**
   * Rehydrates and verifies the admin session from Firebase or secure storage.
   * Never bypasses the biometric lock (see admitSession).
   */
  const rehydrateSession = useCallback(async (): Promise<boolean> => {
    if (isVerifyingRef.current) return isAuthenticated;
    isVerifyingRef.current = true;

    try {
      const storedToken = await getStoredAdminToken();
      const currentUser = auth.currentUser;

      // Case A: active Firebase user
      if (currentUser) {
        try {
          const idToken = await verifyAdminUser(currentUser);
          if (idToken) {
            return await admitSession(idToken, currentUser);
          }
          console.warn('[useAdminBiometric] Firebase user failed admin verification');
          await clearAdminSession();
          setAdminToken('');
          setIsAuthenticated(false);
          return false;
        } catch (verifyErr) {
          console.warn('[useAdminBiometric] Admin verification failed for currentUser:', verifyErr);
        }
      }

      // Case B: no active Firebase user, but a stored admin token
      if (storedToken) {
        // With biometrics enabled a stored token must never restore a session on
        // its own: it also sits in plain Preferences/localStorage for password-only
        // logins, so honouring it would make the fingerprint prompt cosmetic.
        if (await isAdminBiometricsEnabledOnDevice()) {
          setAdminToken('');
          setIsAuthenticated(false);
          setRequiresBiometricUnlock(true);
          return false;
        }

        try {
          const res = await fetch(getApiUrl('/api/admin/verify'), {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data?.firebaseCustomToken) {
              try {
                await signInWithCustomToken(auth, data.firebaseCustomToken);
              } catch (customTokErr) {
                console.warn('[useAdminBiometric] signInWithCustomToken warning:', customTokErr);
              }
            }
            setAdminToken(storedToken);
            setIsAuthenticated(true);
            setError('');
            return true;
          }
          console.warn('[useAdminBiometric] Stored admin token expired or invalid');
          await clearAdminSession();
          setAdminToken('');
          setIsAuthenticated(false);
          return false;
        } catch (tokErr) {
          // Offline and biometrics are not enabled on this device (that case returned above):
          // keep the long-standing offline tolerance. The server still rejects an invalid token.
          console.warn('[useAdminBiometric] Network check failed for stored token:', tokErr);
          setAdminToken(storedToken);
          setIsAuthenticated(true);
          return true;
        }
      }

      // Case C: nothing to restore
      setIsAuthenticated(false);
      setAdminToken('');
      return false;
    } finally {
      isVerifyingRef.current = false;
      setIsInitializing(false);
    }
  }, [isAuthenticated, verifyAdminUser, admitSession]);

  /**
   * Biometric unlock. Standard flow:
   *   1. system prompt (fingerprint / face)
   *   2. reuse the live Firebase session if it is a verified admin, otherwise
   *      sign in with the credentials stored in the keystore
   *   3. server verifies the admin claim, then the session is unlocked
   * Cancelling is not an error: the password option simply stays available.
   */
  const authenticateBiometric = useCallback(
    async (options?: AdminBiometricAuthOptions): Promise<AdminAuthResult> => {
      if (isVerifyingRef.current || isBiometricLoading) {
        return { success: false, method: 'biometric', error: 'Authentication already in progress' };
      }
      isVerifyingRef.current = true;
      setIsBiometricLoading(true);
      setError('');

      const fail = (message: string, extra: Partial<AdminAuthResult> = {}): AdminAuthResult => {
        setError(message);
        return { success: false, method: 'biometric', error: message, ...extra };
      };

      try {
        const prompt = await authenticateAdminWithBiometrics(options);
        if (!prompt.success) {
          if (prompt.cancelled) return prompt; // silent: user chose another way
          setError(
            prompt.lockedOut
              ? 'Biometrik dikunci sementara kerana terlalu banyak percubaan. Sila guna kata laluan.'
              : prompt.error || 'Pengesahan biometrik gagal.'
          );
          return prompt;
        }

        let fbUser: User | null = auth.currentUser;
        let idToken: string | null = null;

        if (fbUser) {
          try {
            idToken = await verifyAdminUser(fbUser);
          } catch (netErr) {
            console.warn('[useAdminBiometric] Could not verify live session:', netErr);
            return fail('Tidak dapat menyambung ke pelayan. Semak sambungan internet anda.');
          }
        }

        if (!idToken) {
          // No live admin session (signed out, or signed in as a customer): use keystore credentials.
          const creds = await getAdminBiometricCredentials();
          if (!creds) {
            await deleteAdminBiometricCredentials();
            await checkBiometrics();
            return fail('Tiada kredensial biometrik disimpan. Sila log masuk dengan kata laluan dan aktifkan semula biometrik.');
          }
          try {
            fbUser = (await signInWithEmailAndPassword(auth, creds.username, creds.password)).user;
          } catch (signErr) {
            if (isStaleCredentialError(signErr)) {
              // Password changed or account disabled: the saved secret is dead, so remove it.
              await deleteAdminBiometricCredentials();
              await checkBiometrics();
              return fail('Kata laluan admin telah berubah. Sila log masuk dengan kata laluan dan aktifkan semula biometrik.');
            }
            console.warn('[useAdminBiometric] Keystore sign-in failed:', signErr);
            return fail('Gagal log masuk. Semak sambungan internet dan cuba lagi.');
          }
          try {
            idToken = await verifyAdminUser(fbUser);
          } catch (netErr) {
            console.warn('[useAdminBiometric] Admin verify failed after sign-in:', netErr);
            return fail('Tidak dapat menyambung ke pelayan. Semak sambungan internet anda.');
          }
        }

        if (!idToken) {
          return fail('Akaun biometrik tidak mempunyai kebenaran pentadbir.');
        }

        setAdminBiometricUnlocked(true);
        await admitSession(idToken, fbUser);
        return { success: true, method: 'biometric', token: idToken };
      } catch (err) {
        console.error('[useAdminBiometric] Biometric unlock error:', err);
        return fail('Ralat pengesahan biometrik.');
      } finally {
        isVerifyingRef.current = false;
        setIsBiometricLoading(false);
      }
    },
    [isBiometricLoading, verifyAdminUser, admitSession, checkBiometrics]
  );

  /**
   * Password login. Biometric enrolment is opt-in (default off) and happens only
   * after a successful login, with its own confirmation prompt. A failed
   * enrolment never fails the login.
   */
  const loginWithPassword = useCallback(
    async (email: string, password: string, enableBiometrics: boolean = false): Promise<AdminAuthResult> => {
      setError('');
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await verifyAdminUser(userCredential.user);

        if (!idToken) {
          const errText = 'Akaun ini tidak mempunyai akses pentadbir.';
          setError(errText);
          await signOut(auth);
          return { success: false, method: 'password', error: errText };
        }

        // A fresh password login satisfies the lock. Must be set BEFORE admitSession.
        setAdminBiometricUnlocked(true);
        await admitSession(idToken, userCredential.user);

        let biometricEnrolled: boolean | undefined;
        if (enableBiometrics) {
          biometricEnrolled = await storeAdminBiometricCredentials(email, password);
          await checkBiometrics();
        }

        return { success: true, method: 'password', token: idToken, biometricEnrolled };
      } catch (err: any) {
        console.error('[useAdminBiometric] Password login error:', err);
        let errMsg = err?.message || 'Gagal log masuk dengan kata laluan.';
        if (isStaleCredentialError(err)) {
          errMsg = 'E-mel atau kata laluan pentadbir tidak sah.';
        }
        setError(errMsg);
        return { success: false, method: 'password', error: errMsg };
      }
    },
    [checkBiometrics, verifyAdminUser, admitSession]
  );

  /**
   * Enrol biometrics for the current admin account (opt-in, with confirmation prompt).
   */
  const storeBiometrics = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      const res = await storeAdminBiometricCredentials(username, password);
      await checkBiometrics();
      return res;
    },
    [checkBiometrics]
  );

  /**
   * Explicitly disable biometrics: removes keystore credentials and the opt-in flag.
   */
  const removeBiometrics = useCallback(async (): Promise<boolean> => {
    const res = await deleteAdminBiometricCredentials();
    await checkBiometrics();
    return res;
  }, [checkBiometrics]);

  /**
   * Sign out. Biometric enrolment is kept so the next sign-in can use it.
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await clearAdminSession();
      await signOut(auth);
    } catch (e) {
      console.warn('[useAdminBiometric] Logout error:', e);
    } finally {
      setAdminBiometricUnlocked(false);
      setUser(null);
      setAdminToken('');
      setIsAuthenticated(false);
      setRequiresBiometricUnlock(false);
      setError('');
    }
  }, []);

  // Initialize biometrics availability on mount
  useEffect(() => {
    checkBiometrics();
  }, [checkBiometrics]);

  // Firebase auth state + initial session rehydration
  useEffect(() => {
    if (!autoRehydrate) {
      setIsInitializing(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idToken = await verifyAdminUser(currentUser);
          if (idToken) {
            await admitSession(idToken, currentUser);
          } else {
            setAdminToken('');
            setIsAuthenticated(false);
            await clearAdminSession();
            setError('Akses pentadbir tidak sah atau dinyahaktifkan.');
          }
        } catch {
          setAdminToken('');
          setIsAuthenticated(false);
        }
      } else {
        await rehydrateSession();
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, [autoRehydrate, rehydrateSession, verifyAdminUser, admitSession]);

  // Global admin login-state event
  useEffect(() => {
    const handleLoginStateChange = () => {
      rehydrateSession();
    };

    window.addEventListener('admin:login-state-change', handleLoginStateChange);
    return () => {
      window.removeEventListener('admin:login-state-change', handleLoginStateChange);
    };
  }, [rehydrateSession]);

  // App lock: after a long time in the background, require biometrics again.
  useEffect(() => {
    if (!autoRehydrate) return;
    let hiddenAt: number | null = null;

    const onVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      const awayMs = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = null;
      if (awayMs < ADMIN_RELOCK_AFTER_MS || !isAdminBiometricUnlocked()) return;
      if (await isAdminBiometricsEnabledOnDevice()) {
        setAdminBiometricUnlocked(false);
        setAdminToken('');
        setIsAuthenticated(false);
        setRequiresBiometricUnlock(true);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [autoRehydrate]);

  return {
    isAvailable,
    biometryType,
    isNative,
    hasAdminBiometrics,
    isCheckingBiometrics,
    isAuthenticated,
    adminToken,
    user,
    isInitializing,
    isBiometricLoading,
    requiresBiometricUnlock,
    error,
    setError,
    authenticateBiometric,
    loginWithPassword,
    storeBiometrics,
    removeBiometrics,
    logout,
    rehydrateSession,
    checkBiometrics,
  };
}

export default useAdminBiometric;
