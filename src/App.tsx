import { useEffect, useState, lazy, Suspense } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { HashRouter as Router, useLocation } from 'react-router-dom';
import { SplashScreen } from '@capacitor/splash-screen';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { Capacitor } from '@capacitor/core';
import { ToastProvider } from './components/ui/Toast';
import { TooltipProvider } from './components/ui/tooltip';
import PushNotificationHandler from './components/notifications/PushNotificationHandler';
import NativeBackButtonHandler from './components/system/NativeBackButtonHandler';
import NativeAppListeners from './components/system/NativeAppListeners';
import { useBatikScrollOpacity } from './hooks/ui/useBatikScrollOpacity';
import CateringSplashScreen from './components/brand/SplashScreen';
import NativeWelcomeScreen from './components/brand/NativeWelcomeScreen';
import WawasanLoader from './components/brand/WawasanLoader';
import { useLanguage } from './context/LanguageContext';
import AppContent from './components/app/AppContent';
import { getApiUrl } from './lib/api';
import { BatikMotionProvider } from './components/brand/BatikMotionProvider';
import { useBackgroundSync } from './hooks/native/useBackgroundSync';
import { useNativeWelcome } from './hooks/native/useNativeWelcome';
import { initInteractiveNotifications } from './services/interactiveNotifications';
import { purgeLegacyPlaintextCredentials, syncRefreshedAdminToken } from './services/authService';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

// Lazy-loaded secondary modals and diagnostics
const GlobalInAppUpdateHandler = lazy(() => import('./components/system/GlobalInAppUpdateHandler'));
const PrivacyPolicyModal = lazy(() => import('./components/system/PrivacyPolicyModal'));
const FallbackDashboard = lazy(() => import('./components/app/FallbackDashboard'));

// Speed Insights wrapper
function VercelSpeedInsights() {
  const location = useLocation();
  if (Capacitor.isNativePlatform()) return null;
  return <SpeedInsights route={location.pathname} />;
}

function App() {
  useBatikScrollOpacity();
  useBackgroundSync();

  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isWebSplashFinished, setIsWebSplashFinished] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const { language } = useLanguage();
  const { stage: welcomeStage, completeWelcome } = useNativeWelcome(isNative);
  const isSplashFinished = isNative
    ? welcomeStage === 'complete' && !isAppLoading
    : isWebSplashFinished;
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  useEffect(() => {
    initInteractiveNotifications().catch(() => {});
  }, []);

  const [useFallbackUi, setUseFallbackUi] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search.includes('fallback=true')) {
        return true;
      }
      localStorage.removeItem('wawasan_fallback_ui');
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // The native welcome is controlled by the saved first-run preference.
    if (isNative) return;
    const watchdog = setTimeout(() => {
      setIsWebSplashFinished(true);
    }, 5000);
    return () => clearTimeout(watchdog);
  }, [isNative]);

  useEffect(() => {
    const handleOpenPrivacy = () => setShowPrivacyPolicy(true);
    window.addEventListener('app:open-privacy-policy', handleOpenPrivacy);
    return () => window.removeEventListener('app:open-privacy-policy', handleOpenPrivacy);
  }, []);

  const handlePrivacyUnderstood = () => {
    setShowPrivacyPolicy(false);
    try {
      sessionStorage.setItem('wawasan_privacy_completed', 'true');
      localStorage.setItem('wawasan_privacy_acknowledged', 'true');
    } catch (err) {
      console.warn('Privacy acknowledgment warning:', err);
    }
  };

  useEffect(() => {
    // Initialize session state on cold start to allow open browsing
    let active = true;
    try {
      const isFreshSession = !sessionStorage.getItem('wawasan_app_initialized');
      if (isFreshSession) {
        sessionStorage.setItem('wawasan_app_initialized', 'true');
        sessionStorage.setItem('wawasan_guest_allowed', 'true');

        // Every cold APK launch starts at the auth-aware entry gate, rather
        // than restoring a stale WebView page from the previous session.
        // The appUrlOpen listener handles an explicitly received deep link.
        if (Capacitor.isNativePlatform()) {
          window.location.hash = '#/';
        }
      }
    } catch (err) {
      console.warn('Session storage init error:', err);
    }

    // F-AUTH-RACE (audit 2026-09-01): syncPreferencesToLocalStorage() used to
    // be fired here, unawaited, on every app boot. It reads the admin token
    // from native Capacitor Preferences and overwrites localStorage with
    // whatever it finds. Because the native bridge call it makes is not
    // instant, it can still be in flight when a user logs in a few seconds
    // later — setSecureItem() writes the fresh, valid token to both stores
    // immediately, but this call (dispatched earlier, resolving later) then
    // overwrites localStorage right back with the stale value it read before
    // login. Every screen that re-reads the token from localStorage after
    // that point (e.g. SettingsPage's diagnostics) ends up sending a stale/
    // invalid token to the server ("Unauthorized: Invalid or expired admin
    // session token"), even though the login itself succeeded and screens
    // that use the in-memory token (e.g. AdminPanel via AdminPage's own
    // `token` state) keep working fine. setSecureItem()/removeSecureItem()
    // already keep Preferences and localStorage in lockstep on every actual
    // login/logout, so this boot-time sync was redundant as well as unsafe.
    // Removed rather than awaited/reordered to eliminate the race outright.

    // Remove plaintext credentials written by older builds (e-mail/password copies in
    // Preferences/localStorage). Idempotent, cheap, never throws.
    void purgeLegacyPlaintextCredentials();

    // Keep the native widget's admin token fresh while the app runs (Firebase rotates it hourly).
    const unsubscribeIdToken = onIdTokenChanged(auth, (user) => {
      if (!user) return;
      void user.getIdToken().then((fresh) => syncRefreshedAdminToken(user.uid, fresh)).catch(() => undefined);
    });

    // Background ping with 2.5s abort timeout to wake up backend immediately on app launch
    const healthController = new AbortController();
    const healthTimeout = setTimeout(() => healthController.abort(), 2500);
    fetch(getApiUrl('/api/health'), { method: 'GET', signal: healthController.signal })
      .catch(() => {
        // Ignore network errors or aborts on background ping
      })
      .finally(() => {
        clearTimeout(healthTimeout);
      });

    const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);
    };

    let safeAreaListenerHandle: { remove: () => void } | null = null;

    const applySafeAreaInsets = (insets: { top: number; bottom: number; left: number; right: number }) => {
      if (!active) return;
      const root = document.documentElement;
      root.style.setProperty('--safe-area-inset-top', `${insets.top}px`);
      root.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`);
      root.style.setProperty('--safe-area-inset-left', `${insets.left}px`);
      root.style.setProperty('--safe-area-inset-right', `${insets.right}px`);
      root.style.setProperty('--sat', `${insets.top}px`);
      root.style.setProperty('--sab', `${insets.bottom}px`);
      root.style.setProperty('--sal', `${insets.left}px`);
      root.style.setProperty('--sar', `${insets.right}px`);
    };

    const initializeNativePlugins = async () => {
      try {
        if (Capacitor.isPluginAvailable('SplashScreen')) {
          await withTimeout(SplashScreen.hide(), 1500, undefined);
        }
      } catch (err) {
        console.warn('SplashScreen hide warning:', err);
      } finally {
        if (active) setIsAppLoading(false);
      }

      if (!active) return;
      try {
        if (Capacitor.isPluginAvailable('SafeArea')) {
          const result = await withTimeout(
            SafeArea.getSafeAreaInsets(),
            1500,
            { insets: { top: 0, bottom: 0, left: 0, right: 0 } }
          );
          if (!active) return;
          if (result && result.insets) {
            applySafeAreaInsets(result.insets);
          }

          // Dynamically listen for safe area changes (orientation, system cutouts, soft keyboard/navigation)
          const handle = await SafeArea.addListener('safeAreaChanged', (data) => {
            if (data && data.insets) {
              applySafeAreaInsets(data.insets);
            }
          });
          if (active) safeAreaListenerHandle = handle;
          else await handle.remove();
        }
      } catch (err) {
        console.warn('SafeArea plugin error:', err);
      }
    };

    initializeNativePlugins();

    return () => {
      active = false;
      healthController.abort();
      clearTimeout(healthTimeout);
      unsubscribeIdToken();
      if (safeAreaListenerHandle) {
        void safeAreaListenerHandle.remove();
      }
    };
  }, []);

  if (useFallbackUi) {
    return (
      <TooltipProvider delayDuration={500}>
        <ToastProvider>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <FallbackDashboard onExit={() => setUseFallbackUi(false)} />
          </Suspense>
        </ToastProvider>
      </TooltipProvider>
    );
  }

  return (
    <>
      {!isSplashFinished && (isNative ? (
        welcomeStage === 'welcome' ? (
          <NativeWelcomeScreen isLoading={isAppLoading} onComplete={completeWelcome} />
        ) : (
          <div role="status" className="fixed inset-0 z-[9999] grid place-items-center bg-[var(--ui-canvas)]">
            <div aria-hidden="true"><WawasanLoader size={144} /></div>
            <span className="sr-only">{language === 'bm' ? 'Membuka aplikasi…' : 'Opening the app…'}</span>
          </div>
        )
      ) : (
        <CateringSplashScreen
          isLoading={isAppLoading}
          onComplete={() => setIsWebSplashFinished(true)}
        />
      ))}
      <TooltipProvider delayDuration={500}>
        <ToastProvider>
          <BatikMotionProvider>
            {showPrivacyPolicy && isSplashFinished && (
              <Suspense fallback={null}>
                <PrivacyPolicyModal
                  isOpen={showPrivacyPolicy && isSplashFinished}
                  onUnderstood={handlePrivacyUnderstood}
                  onDismiss={() => setShowPrivacyPolicy(false)}
                />
              </Suspense>
            )}
            <Router>
              <VercelSpeedInsights />
              <PushNotificationHandler />
              <NativeBackButtonHandler isWelcomeActive={isNative && !isSplashFinished} />
              <NativeAppListeners />
              {isSplashFinished && (
                <>
                  <Suspense fallback={null}>
                    <GlobalInAppUpdateHandler />
                  </Suspense>
                  <AppContent />
                </>
              )}
            </Router>
          </BatikMotionProvider>
        </ToastProvider>
      </TooltipProvider>
    </>
  );
}

export default App;
