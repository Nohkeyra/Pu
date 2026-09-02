import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, ArrowLeft, Shield, Sun, Moon, Loader2, Fingerprint } from 'lucide-react';
import WawasanLoader from '@/components/WawasanLoader';
import { useNavigate } from 'react-router-dom';
import AdminPanel from '@/components/AdminPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Batik3DMotion } from '@/components/Batik3DMotion';
import { getApiUrl } from '@/lib/api';
import { getAssetUrl } from '@/lib/utils';
import { TransparentLogo } from '@/components/TransparentLogo';
import { setSecureItem, getSecureItem, removeSecureItem } from '@/lib/preferences';
import { authService, isBiometricAvailable } from '@/services/authService';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from '@/firebaseConfig';

// NOTE: the admin password itself is never stored anywhere on the device
// (not localStorage, not Preferences). It is sent to the server exactly
// once, at login, in exchange for a short-lived (12h) JWT session token.
// That token — never the password — is what gets persisted and resent
// on subsequent admin API calls.
const ADMIN_TOKEN_STORAGE_KEY = 'wawasan_admin_token';

export default function AdminPage() {
  const { t, language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        sessionStorage.setItem('wawasan_session_started', 'true');
        sessionStorage.setItem('wawasan_guest_allowed', 'true');
      } catch (storageErr) {
        console.warn('SessionStorage unavailable:', storageErr);
      }
      // BUG FIX (audit 2026-08-28): getSecureItem() (Capacitor Preferences
      // bridge) was called outside any try/catch. If the native bridge
      // throws — e.g. a transient failure right after app resume/cold
      // start — this whole init() rejects unhandled, and the line below
      // that turns off the loading screen never runs. The user is then
      // stuck on the full-screen "Memuatkan..." loader forever with no
      // error, no retry, and no way out short of force-closing the app.
      // Safe fallback: treat a failed read the same as "no stored token"
      // and fall through to the login screen rather than hanging.
      try {
        const storedToken = await getSecureItem(ADMIN_TOKEN_STORAGE_KEY);
        if (storedToken) {
          try {
            const response = await fetch(getApiUrl('/api/admin/verify'), {
              headers: { 'Authorization': `Bearer ${storedToken}` }
            });
            if (response.ok) {
              const data = await response.json();
              if (data && data.success) {
                if (data.firebaseCustomToken) {
                  try {
                    await signInWithCustomToken(auth, data.firebaseCustomToken);
                    console.log('[Admin Auth] Session restored: Logged into Firebase Auth as admin');
                  } catch (fbAuthErr) {
                    console.error('[Admin Auth] Session restore: Failed Firebase Auth sign-in:', fbAuthErr);
                  }
                }
                setToken(storedToken);
                setIsAuthenticated(true);
              } else {
                await removeSecureItem(ADMIN_TOKEN_STORAGE_KEY);
              }
            } else if (response.status === 401 || response.status === 403) {
              // Server has definitively confirmed this token is invalid —
              // safe to clear it.
              await removeSecureItem(ADMIN_TOKEN_STORAGE_KEY);
            } else {
              // Some other failure (5xx, 429, proxy/cold-start hiccup, etc.)
              // — this is NOT proof the token is invalid, just that this one
              // verification request didn't succeed. Keep the session active
              // locally rather than logging the admin out over a transient
              // server issue; the token will be re-verified next time a real
              // admin-authenticated request is made.
              console.warn(`[Admin Auth] Token verification returned ${response.status} (not a definitive auth failure) — keeping local session.`);
              setToken(storedToken);
              setIsAuthenticated(true);
            }
          } catch (verifyErr) {
            console.warn('[Admin Auth] Token verification network/fetch failed, falling back to local session:', verifyErr);
            // Offline/network failure fallback: keep the session active locally
            setToken(storedToken);
            setIsAuthenticated(true);
          }
        }
      } catch (secureItemErr) {
        console.warn('[Admin Auth] Failed to read stored admin token:', secureItemErr);
      }

      // Check biometric availability on mount
      try {
        const available = await isBiometricAvailable();
        setBiometricAvailable(available);
      } catch (bioErr) {
        console.warn('[Admin Auth] Biometric check failed:', bioErr);
        setBiometricAvailable(false);
      }

      setIsInitializing(false);
    };
    init();
  }, []);

  const handleBiometricLogin = async () => {
    setError('');
    setIsBiometricLoading(true);
    try {
      const isMalay = language === 'bm';
      const result = await authService.authenticateAdminWithBiometrics({
        title: isMalay ? 'Log Masuk Cap Jari Admin' : 'Admin Fingerprint Login',
        subtitle: isMalay ? 'Imbas cap jari anda untuk akses segera' : 'Scan your fingerprint for instant access',
        description: isMalay ? 'Pentadbir Restoran Wawasan sahaja.' : 'Restoran Wawasan administrators only.',
        negativeButtonText: isMalay ? 'Guna Kata Laluan' : 'Use Password',
      });

      if (result.success && result.token) {
        try {
          const response = await fetch(getApiUrl('/api/admin/verify'), {
            headers: { 'Authorization': `Bearer ${result.token}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data && data.success && data.firebaseCustomToken) {
              await signInWithCustomToken(auth, data.firebaseCustomToken);
              console.log('[Admin Auth] Biometric Login: Logged into Firebase Auth as admin');
            }
          }
        } catch (verifyErr) {
          console.warn('[Admin Auth] Biometric Login: Firebase Auth sync fetch failed:', verifyErr);
        }

        setToken(result.token);
        await setSecureItem(ADMIN_TOKEN_STORAGE_KEY, result.token);
        setIsAuthenticated(true);
        try {
          window.dispatchEvent(new CustomEvent('admin:login-state-change'));
        } catch (e) {
          console.warn('Failed to dispatch login event:', e);
        }
      } else if (result.success) {
        // Biometrics succeeded on hardware level; check stored session
        const storedToken = await getSecureItem(ADMIN_TOKEN_STORAGE_KEY);
        if (storedToken) {
          try {
            const response = await fetch(getApiUrl('/api/admin/verify'), {
              headers: { 'Authorization': `Bearer ${storedToken}` }
            });
            if (response.ok) {
              const data = await response.json();
              if (data && data.success && data.firebaseCustomToken) {
                await signInWithCustomToken(auth, data.firebaseCustomToken);
                console.log('[Admin Auth] Biometric Session Restore: Logged into Firebase Auth as admin');
              }
            }
          } catch (verifyErr) {
            console.warn('[Admin Auth] Biometric Session Restore: Firebase Auth sync fetch failed:', verifyErr);
          }

          setToken(storedToken);
          setIsAuthenticated(true);
          try {
            window.dispatchEvent(new CustomEvent('admin:login-state-change'));
          } catch (e) {
            console.warn('Failed to dispatch login event:', e);
          }
        } else {
          setError(
            language === 'bm'
              ? 'Sila log masuk dengan kata laluan sekali terlebih dahulu untuk mengaktifkan imbasan cap jari.'
              : 'Please log in with your password once to register fingerprint access on this device.'
          );
        }
      } else {
        if (result.error) {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error('Biometric authentication exception:', err);
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Biometric error: ${detail}`);
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      let data: {
        success?: boolean;
        token?: string;
        firebaseCustomToken?: string;
        error?: string;
      } = {};
      try {
        data = await response.json();
      } catch (parseErr) {
        console.warn('Failed to parse admin login response JSON:', parseErr);
      }

      if (response.ok && data.success && data.token) {
        if (data.firebaseCustomToken) {
          try {
            await signInWithCustomToken(auth, data.firebaseCustomToken);
            console.log('[Admin Auth] Login: Logged into Firebase Auth as admin');
          } catch (fbAuthErr) {
            console.error('[Admin Auth] Login: Failed Firebase Auth sign-in:', fbAuthErr);
          }
        }

        setToken(data.token);
        await setSecureItem(ADMIN_TOKEN_STORAGE_KEY, data.token);

        // If biometrics are available on device, securely cache credentials for future fingerprint login
        if (biometricAvailable) {
          try {
            await authService.storeAdminBiometricCredentials('admin', data.token);
          } catch (bioStoreErr) {
            console.warn('[Admin Auth] Biometric credential storage note:', bioStoreErr);
          }
        }

        setIsAuthenticated(true);
        try {
          window.dispatchEvent(new CustomEvent('admin:login-state-change'));
        } catch (e) {
          console.warn('Failed to dispatch login event:', e);
        }
      } else {
        const serverError =
          data?.error || (response.status ? `Server HTTP ${response.status}` : null);
        setError(serverError || t('wrong_password') || 'Invalid password');
      }
    } catch (err) {
      console.error('Login error:', err);
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Connection error: ${detail}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Session Verification
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background flex flex-col items-center justify-center p-6 space-y-3">
        <WawasanLoader size={80} />
        <p className="text-xs font-semibold tracking-widest text-amber-800 dark:text-amber-400 uppercase animate-pulse">Memuatkan...</p>
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background pattern-dots flex flex-col relative">
        <header className="fixed top-0 left-0 right-0 z-50 bg-cream/90 dark:bg-background/90 backdrop-blur-xl border-b border-border pt-[var(--sat)]">
          <div className="flex items-center justify-between px-4 sm:px-6 md:px-12 min-h-[60px] sm:min-h-[64px]">
            {/*
              P0 — `<div onClick>` collapsed to a real <button> so
              keyboard activation, focus ring, and the 44 × 44 tap
              floor all behave correctly.
            */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="touch-target-row flex items-center gap-3 group text-left"
              aria-label="Go to login"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                {/*
                  Brand asset path preserved verbatim — visual logo /
                  Malaysian heritage graphic must remain 100% intact.
                */}
                <TransparentLogo
                  src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
                  alt="Restoran Wawasan Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-display font-semibold text-xl text-deep-forest dark:text-white leading-none">
                  Wawasan
                </span>
                <span className="block font-body text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--color-sunshine-cta)] mt-1 leading-tight">
                  Pak Usop
                </span>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 md:p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-deep-forest" />
                ) : (
                  <Sun className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
                )}
              </button>
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-stone hover:text-crisp-carrot hover:bg-[var(--color-sunshine-cta)]/10 rounded-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back')}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pt-[calc(72px+var(--sat)+2rem)] relative">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-card rounded-3xl shadow-2xl border border-border overflow-hidden relative">
              {/* Background Batik Pattern for Admin Login Card */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <Batik3DMotion
                  maxRotation={12}
                  imgClassName="opacity-[0.14] dark:opacity-[0.22]"
                  mode="background"
                />
              </div>

              <div className="h-2 bg-gradient-to-r from-sunshine to-crisp-carrot relative z-10" />

              <div className="p-8 md:p-10 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-sunshine-cta)]/10 flex items-center justify-center border border-[var(--color-sunshine-cta)]/20">
                    <Lock className="w-8 h-8 text-[var(--color-sunshine-cta)]" />
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-display font-bold text-deep-forest text-center mb-2">
                  {t('admin_login')}
                </h2>
                <p className="text-stone text-center text-sm font-medium mb-8 uppercase tracking-widest microcopy-12-upper">
                  Restricted Access • Admin Only
                </p>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-deep-forest mb-2">
                      {t('password')}
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-cream dark:bg-background border-border text-deep-forest placeholder:text-stone focus:border-[var(--color-sunshine-cta)] focus:ring-1 focus:ring-[var(--color-sunshine-cta)] h-12 rounded-xl"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-tomato-burst/10 border border-tomato-burst/20 text-tomato-burst text-sm font-semibold text-center">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={isLoading || isBiometricLoading}
                      className="w-full h-12 bg-[var(--color-sunshine-cta)] text-white font-bold hover:bg-crisp-carrot transition-colors duration-300 disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl shadow-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4" />
                          {t('loading')}
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          {t('login')}
                        </>
                      )}
                    </Button>

                    {/* Fingerprint / Biometric scan button */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-card px-2 text-stone font-semibold tracking-wider">
                          {language === 'bm' ? 'Atau Imbas Biometrik' : 'Or Scan Biometric'}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBiometricLogin}
                      disabled={isLoading || isBiometricLoading}
                      className="w-full h-12 border-2 border-[var(--color-sunshine-cta)]/30 hover:border-[var(--color-sunshine-cta)] text-deep-forest dark:text-white font-bold hover:bg-[var(--color-sunshine-cta)]/10 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2.5 rounded-xl shadow-sm"
                    >
                      {isBiometricLoading ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 text-[var(--color-sunshine-cta)]" />
                          <span>{language === 'bm' ? 'Mengesahkan Cap Jari...' : 'Verifying Fingerprint...'}</span>
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-5 h-5 text-[var(--color-sunshine-cta)] animate-pulse" />
                          <span>{language === 'bm' ? 'Imbas Cap Jari Admin' : 'Scan Admin Fingerprint'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                <p className="mt-8 text-center microcopy-12-upper text-stone max-w-[40ch] mx-auto">
                  This area is protected. Unauthorized access is prohibited.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // STABILITY FIX (2026-08-13): AdminPanel.tsx is the largest, most complex
  // component in the app (1600+ lines) and previously had no ErrorBoundary
  // of its own — unlike CalendarPage, SettingsPage, and OrderPage, which
  // each already have one. Without it, a React error thrown anywhere inside
  // Admin Panel would propagate all the way up to the root ErrorBoundary in
  // main.tsx, taking down the entire app (including navigation) instead of
  // being contained to the Admin screen. This is Noh's primary daily-use
  // screen, so an isolated failure here mattering most.
  // Admin Dashboard
  return (
    <ErrorBoundary>
      <AdminPanel
        adminToken={token}
        onLogout={async () => {
          if (token) {
            try {
              await fetch(getApiUrl('/api/admin/logout'), {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
            } catch (err) {
              console.warn('[Admin Auth] Server logout token revocation failed (non-fatal):', err);
            }
          }
          try {
            await signOut(auth);
            console.log('[Admin Auth] Logged out of Firebase Auth successfully');
          } catch (fbSignOutErr) {
            console.warn('[Admin Auth] Firebase Auth sign out failed:', fbSignOutErr);
          }
          await removeSecureItem(ADMIN_TOKEN_STORAGE_KEY);
          // Ensure all possible admin flags are flushed to prevent UI state leakage
          try {
            localStorage.removeItem('wawasan_admin_token');
            localStorage.removeItem('wawasan_admin_authenticated');
            sessionStorage.removeItem('wawasan_admin_token');
            sessionStorage.removeItem('wawasan_session_started');
            sessionStorage.removeItem('wawasan_guest_allowed');
          } catch (e) {
            console.warn('Manual storage cleanup warning:', e);
          }

          setIsAuthenticated(false);
          setToken('');
          try {
            window.dispatchEvent(new CustomEvent('admin:login-state-change'));
          } catch {
            // Ignored
          }
          // Ensure a full clean slate of UI states/blurs by reloading
          window.location.reload();
        }}
      />
    </ErrorBoundary>
  );
}
