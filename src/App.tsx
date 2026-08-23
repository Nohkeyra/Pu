import { useEffect, useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { HashRouter as Router, useLocation } from 'react-router-dom';
import { SplashScreen } from '@capacitor/splash-screen';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { Capacitor } from '@capacitor/core';
import { syncPreferencesToLocalStorage } from './lib/preferences';
import { ToastProvider } from './components/ui/Toast';
import { TooltipProvider } from './components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import PushNotificationHandler from './components/PushNotificationHandler';
import NativeBackButtonHandler from './components/NativeBackButtonHandler';
import NativeAppListeners from './components/NativeAppListeners';
import InAppUpdateModal from './components/InAppUpdateModal';
import InAppUpdateBanner from './components/InAppUpdateBanner';
import { useInAppUpdates } from './hooks/useInAppUpdates';
import { useBatikScrollOpacity } from './hooks/useBatikScrollOpacity';
import CateringSplashScreen from './components/SplashScreen';
import FallbackDashboard from './components/app/FallbackDashboard';
import AppContent from './components/app/AppContent';

// Speed Insights wrapper
function VercelSpeedInsights() {
  const location = useLocation();
  if (Capacitor.isNativePlatform()) return null;
  return <SpeedInsights route={location.pathname} />;
}

function GlobalInAppUpdateHandler() {
  const { 
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
        isForceUpdate={isForceUpdate}
        onDismiss={dismissUpdate}
      />
    </>
  );
}

function App() {
  useBatikScrollOpacity();

  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [useFallbackUi, setUseFallbackUi] = useState(() => {
    try {
      return localStorage.getItem('wawasan_fallback_ui') === 'true' || 
             window.location.search.includes('fallback=true');
    } catch {
      return false;
    }
  });
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTroubleshoot(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    syncPreferencesToLocalStorage();

    const runWhenIdle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1000));
    runWhenIdle(() => {
      import('./services/pdfService').then(({ preloadLogoForPDF, preloadBatikHeaderForPDF }) => {
        preloadLogoForPDF().catch((err) => {
          console.warn('Logo preloading failed:', err);
        });
        preloadBatikHeaderForPDF().catch((err) => {
          console.warn('Batik header preloading failed:', err);
        });
      }).catch((err) => {
        console.warn('pdfService preload import failed:', err);
      });
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
          onComplete={() => setIsSplashFinished(true)} 
        />
      )}
      {!isSplashFinished && showTroubleshoot && (
        <div className="fixed bottom-24 left-0 right-0 z-[110] flex flex-col items-center justify-center px-6">
          <button
            onClick={() => {
              try { localStorage.setItem('wawasan_fallback_ui', 'true'); } catch (err) {
                console.warn('Failed to set fallback UI preference:', err);
              }
              setUseFallbackUi(true);
              setIsAppLoading(false);
              setIsSplashFinished(true);
            }}
            className="btn-cta touch-target-row min-h-[44px] px-6 py-3.5 font-bold rounded-2xl shadow-xl flex items-center gap-2 text-sm"
          >
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            Gunakan Fallback UI
          </button>
        </div>
      )}
      <TooltipProvider delayDuration={500}>
        <ToastProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <VercelSpeedInsights />
            <PushNotificationHandler />
            <NativeBackButtonHandler />
            <NativeAppListeners />
            <GlobalInAppUpdateHandler />
            <AppContent />
          </Router>
        </ToastProvider>
      </TooltipProvider>
    </>
  );
}

export default App;
