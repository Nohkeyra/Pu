import { useEffect, useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { HashRouter as Router, useLocation } from 'react-router-dom';
import { SplashScreen } from '@capacitor/splash-screen';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { Capacitor } from '@capacitor/core';
import { ToastProvider } from './components/ui/Toast';
import { TooltipProvider } from './components/ui/tooltip';
import PushNotificationHandler from './components/PushNotificationHandler';
import NativeBackButtonHandler from './components/NativeBackButtonHandler';
import NativeAppListeners from './components/NativeAppListeners';
import InAppUpdateModal from './components/InAppUpdateModal';
import InAppUpdateBanner from './components/InAppUpdateBanner';
import { useInAppUpdates } from './hooks/useInAppUpdates';
import { useBatikScrollOpacity } from './hooks/useBatikScrollOpacity';
import CateringSplashScreen from './components/SplashScreen';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import FallbackDashboard from './components/app/FallbackDashboard';
import AppContent from './components/app/AppContent';
import { getApiUrl } from './lib/api';
import { BatikMotionProvider } from './components/BatikMotionProvider';
import { useBackgroundSync } from './hooks/useBackgroundSync';
import { initInteractiveNotifications } from './services/interactiveNotifications';

// Speed Insights wrapper
function VercelSpeedInsights() {
  const location = useLocation();
  if (Capacitor.isNativePlatform()) return null;
  return <SpeedInsights route={location.pathname} />;
}

function GlobalInAppUpdateHandler() {
  const { 
    currentVersion,
    updateAvailable, 
    showNotificationBanner, 
    latestConfig, 
    isForceUpdate, 
    dismissUpdate, 
    dismissNotificationBanner, 
    showUpdateModalManually 
  } = useInAppUpdates();

  return (
    <>
      <InAppUpdateBanner
        visible={showNotificationBanner && !updateAvailable}
        config={latestConfig}
        onOpenModal={showUpdateModalManually}
        onDismiss={dismissNotificationBanner}
      />
      <InAppUpdateModal
        isOpen={updateAvailable}
        config={latestConfig}
        currentVersion={currentVersion}
        isForceUpdate={isForceUpdate}
        onDismiss={dismissUpdate}
      />
    </>
  );
}

function App() {
  useBatikScrollOpacity();
  useBackgroundSync();

  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isSplashFinished, setIsSplashFinished] = useState(false);
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
    // Failsafe safety watchdog: guarantees main interface mounts within 5.0s
    const watchdog = setTimeout(() => {
      setIsSplashFinished(true);
    }, 5000);
    return () => clearTimeout(watchdog);
  }, []);

  useEffect(() => {
    const handleOpenPrivacy = () => setShowPrivacyPolicy(true);
    window.addEventListener('app:open-privacy-policy', handleOpenPrivacy);
    return () => window.removeEventListener('app:open-privacy-policy', handleOpenPrivacy);
  }, []);

  const handleSplashComplete = () => {
    setIsSplashFinished(true);
    try {
      const isAcknowledged = localStorage.getItem('wawasan_privacy_acknowledged') === 'true';
      if (!isAcknowledged) {
        setShowPrivacyPolicy(true);
      }
    } catch {
      setShowPrivacyPolicy(true);
    }
  };

  const handlePrivacyUnderstood = () => {
    setShowPrivacyPolicy(false);
    try {
      sessionStorage.setItem('wawasan_privacy_completed', 'true');
      if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '#/login') {
        window.location.hash = '#/';
      }
    } catch (err) {
      console.warn('Privacy redirect warning:', err);
    }
  };

  useEffect(() => {
    // F-LAUNCH: Force landing on Login Page on fresh cold starts
    try {
      const isFreshSession = !sessionStorage.getItem('wawasan_app_initialized');
      if (isFreshSession) {
        sessionStorage.setItem('wawasan_app_initialized', 'true');
        sessionStorage.removeItem('wawasan_session_started');
        sessionStorage.removeItem('wawasan_guest_allowed');
        if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '#/login') {
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

    // Fire-and-forget background ping to wake up Render (or any sleeping backend) 
    // immediately on app launch so it is ready by the time the user logs in.
    fetch(getApiUrl('/api/health'), { method: 'GET' }).catch(() => {
      // Ignore network errors on background ping
    });

    const hideSplash = async () => {
      try {
        if (Capacitor.isPluginAvailable('SplashScreen')) await SplashScreen.hide();
      } catch (err) {
        console.warn('SplashScreen hide warning:', err);
      } finally {
        setIsAppLoading(false);
      }
    };
    hideSplash();

    const setupSafeArea = async () => {
      try {
        const { insets } = await SafeArea.getSafeAreaInsets();
        document.documentElement.style.setProperty('--safe-area-inset-top', `${insets.top}px`);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`);
      } catch (err) {
        console.warn('SafeArea plugin error:', err);
      }
    };
    setupSafeArea();
  }, []);

  if (useFallbackUi) {
    return (
      <TooltipProvider delayDuration={500}>
        <ToastProvider>
          <FallbackDashboard onExit={() => setUseFallbackUi(false)} />
        </ToastProvider>
      </TooltipProvider>
    );
  }

  return (
    <>
      {!isSplashFinished && (
        <CateringSplashScreen 
          isLoading={isAppLoading} 
          onComplete={handleSplashComplete} 
        />
      )}
      <TooltipProvider delayDuration={500}>
        <ToastProvider>
          <BatikMotionProvider>
            <PrivacyPolicyModal
              isOpen={showPrivacyPolicy && isSplashFinished}
              onUnderstood={handlePrivacyUnderstood}
            />
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <VercelSpeedInsights />
              <PushNotificationHandler />
              <NativeBackButtonHandler />
              <NativeAppListeners />
              <GlobalInAppUpdateHandler />
              <AppContent />
            </Router>
          </BatikMotionProvider>
        </ToastProvider>
      </TooltipProvider>
    </>
  );
}

export default App;
