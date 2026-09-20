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
import { getSecureItem } from '@/lib/preferences';
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
  ADMIN_BIOMETRIC_PREF_KEY,
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

      const prefEnabled = await getSecureItem(ADMIN_BIOMETRIC_PREF_KEY);
      const creds = await getAdminBiometricCredentials();
      const hasCreds = Boolean(creds?.username && creds?.password);
      const isEnabled = (avail.isAvailable || !avail.isNative) && prefEnabled === 'true' && hasCreds;
      
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
   * Rehydrates and verifies admin session from secure storage or server verification
   */
  const rehydrateSession = useCallback(async (): Promise<boolean> => {
    if (isVerifyingRef.current) return isAuthenticated;
    isVerifyingRef.current = true;

    try {
      const storedToken = await getStoredAdminToken();
      const currentUser = auth.currentUser;

      // Case A: Active Firebase Auth User
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken(true);
          const res = await fetch(getApiUrl('/api/admin/verify'), {
            headers: { Authorization: `Bearer ${idToken}` },
          });

          if (res.ok) {
            await saveAdminToken(idToken);
            setAdminToken(idToken);
            setUser(currentUser);
            setIsAuthenticated(true);
            setError('');
            return true;
          } else {
            console.warn('[useAdminBiometric] Firebase user failed admin verification');
            await clearAdminSession();
            setAdminToken('');
            setIsAuthenticated(false);
            return false;
          }
        } catch (verifyErr) {
          console.warn('[useAdminBiometric] Admin verification failed for currentUser:', verifyErr);
        }
      }

      // Case B: No active Firebase User, check stored admin token
      if (storedToken) {
        // If this device has admin biometrics enabled, a persisted token
        // must never be enough on its own to silently restore a session
        // on app open/reload — that would make the fingerprint prompt
        // purely cosmetic, since the same token also lives in a plain,
        // non-biometric-gated Preferences/localStorage copy (kept so a
        // plain password-only admin login also gets normal "stay logged
        // in" behavior). Require an explicit authenticateBiometric() call
        // instead when biometrics are enabled.
        const biometricsEnabled = await isAdminBiometricsEnabledOnDevice();
        if (biometricsEnabled) {
          setAdminToken('');
          setIsAuthenticated(false);
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
          } else {
            console.warn('[useAdminBiometric] Stored admin token expired or invalid');
            await clearAdminSession();
            setAdminToken('');
            setIsAuthenticated(false);
            return false;
          }
        } catch (tokErr) {
          console.warn('[useAdminBiometric] Network check failed for stored token:', tokErr);
          setAdminToken(storedToken);
          setIsAuthenticated(true);
          return true;
        }
      }

      // Case C: No token or session
      setIsAuthenticated(false);
      setAdminToken('');
      return false;
    } finally {
      isVerifyingRef.current = false;
      setIsInitializing(false);
    }
  }, [isAuthenticated]);

  /**
   * Perform Biometric Authentication & Session Recovery
   */
  const authenticateBiometric = useCallback(
    async (options?: AdminBiometricAuthOptions): Promise<AdminAuthResult> => {
      setIsBiometricLoading(true);
      setError('');

      try {
        // Step 1: Trigger native biometric verification prompt
        const promptResult = await authenticateAdminWithBiometrics(options);
        if (!promptResult.success) {
          setIsBiometricLoading(false);
          const errMsg = promptResult.error || 'Pengesahan biometrik gagal.';
          if (!errMsg.toLowerCase().includes('cancel')) {
            setError(errMsg);
          }
          return promptResult;
        }

        // Step 2: Retrieve stored biometric credentials from secure storage / hardware keychain
        const creds = await getAdminBiometricCredentials();
        if (creds && creds.username && creds.password) {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, creds.username, creds.password);
            const idToken = await userCredential.user.getIdToken(true);

            // Verify admin claim with backend
            const res = await fetch(getApiUrl('/api/admin/verify'), {
              headers: { Authorization: `Bearer ${idToken}` },
            });

            if (res.ok) {
              await saveAdminToken(idToken);
              setAdminToken(idToken);
              setUser(userCredential.user);
              setIsAuthenticated(true);
              setError('');
              return {
                success: true,
                method: 'biometric',
                token: idToken,
              };
            } else {
              const errText = 'Akaun biometrik tidak mempunyai kebenaran pentadbir.';
              setError(errText);
              return {
                success: false,
                method: 'biometric',
                error: errText,
              };
            }
          } catch (signErr: any) {
            console.error('[useAdminBiometric] Firebase sign-in with biometric creds failed:', signErr);
            const errMsg = signErr?.message || 'Gagal log masuk dengan kredensial biometrik yang disimpan.';
            setError(errMsg);
            return {
              success: false,
              method: 'biometric',
              error: errMsg,
            };
          }
        }

        // Fallback: If no email/password in keychain, check if storedToken is available
        const storedToken = promptResult.token || (await getStoredAdminToken());
        if (storedToken) {
          await saveAdminToken(storedToken);
          setAdminToken(storedToken);
          setIsAuthenticated(true);
          setError('');
          return {
            success: true,
            method: 'biometric',
            token: storedToken,
          };
        }

        const noCredsErr = 'Tiada kredensial biometrik disimpan. Sila log masuk dengan kata laluan terlebih dahulu.';
        setError(noCredsErr);
        return {
          success: false,
          method: 'biometric',
          error: noCredsErr,
        };
      } catch (err: any) {
        console.error('[useAdminBiometric] Biometric unlock error:', err);
        const errMsg = err?.message || 'Ralat pengesahan biometrik.';
        if (!errMsg.toLowerCase().includes('cancel')) {
          setError(errMsg);
        }
        return {
          success: false,
          method: 'biometric',
          error: errMsg,
        };
      } finally {
        setIsBiometricLoading(false);
      }
    },
    []
  );

  /**
   * Password Authentication and optional biometric storage
   */
  const loginWithPassword = useCallback(
    async (email: string, password: string, enableBiometrics: boolean = true): Promise<AdminAuthResult> => {
      setError('');
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken(true);

        const res = await fetch(getApiUrl('/api/admin/verify'), {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!res.ok) {
          const errText = 'Akaun ini tidak mempunyai akses pentadbir.';
          setError(errText);
          await signOut(auth);
          return {
            success: false,
            method: 'password',
            error: errText,
          };
        }

        await saveAdminToken(idToken);
        setAdminToken(idToken);
        setUser(userCredential.user);
        setIsAuthenticated(true);

        if (enableBiometrics) {
          await storeAdminBiometricCredentials(email, password);
          await checkBiometrics();
        }

        return {
          success: true,
          method: 'password',
          token: idToken,
        };
      } catch (err: any) {
        console.error('[useAdminBiometric] Password login error:', err);
        let errMsg = err?.message || 'Gagal log masuk dengan kata laluan.';
        if (err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
          errMsg = 'E-mel atau kata laluan pentadbir tidak sah.';
        }
        setError(errMsg);
        return {
          success: false,
          method: 'password',
          error: errMsg,
        };
      }
    },
    [checkBiometrics]
  );

  /**
   * Store credentials in hardware keychain / secure preferences
   */
  const storeBiometrics = useCallback(
    async (username: string, passwordOrToken: string): Promise<boolean> => {
      const res = await storeAdminBiometricCredentials(username, passwordOrToken);
      await checkBiometrics();
      return res;
    },
    [checkBiometrics]
  );

  /**
   * Delete credentials from hardware keychain / secure preferences
   */
  const removeBiometrics = useCallback(async (): Promise<boolean> => {
    const res = await deleteAdminBiometricCredentials();
    await checkBiometrics();
    return res;
  }, [checkBiometrics]);

  /**
   * Logout and clear all admin session artifacts
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await clearAdminSession();
      await signOut(auth);
    } catch (e) {
      console.warn('[useAdminBiometric] Logout error:', e);
    } finally {
      setUser(null);
      setAdminToken('');
      setIsAuthenticated(false);
      setError('');
    }
  }, []);

  // Initialize biometrics availability on mount
  useEffect(() => {
    checkBiometrics();
  }, [checkBiometrics]);

  // Handle Firebase Auth state changes and initial session rehydration
  useEffect(() => {
    if (!autoRehydrate) {
      setIsInitializing(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken(true);
          const res = await fetch(getApiUrl('/api/admin/verify'), {
            headers: { Authorization: `Bearer ${idToken}` },
          });

          if (res.ok) {
            await saveAdminToken(idToken);
            setAdminToken(idToken);
            setIsAuthenticated(true);
            setError('');
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
  }, [autoRehydrate, rehydrateSession]);

  // Listen for global admin login state change event
  useEffect(() => {
    const handleLoginStateChange = () => {
      rehydrateSession();
    };

    window.addEventListener('admin:login-state-change', handleLoginStateChange);
    return () => {
      window.removeEventListener('admin:login-state-change', handleLoginStateChange);
    };
  }, [rehydrateSession]);

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
