import { useEffect, useState, lazy, Suspense, type ReactNode } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { cn } from './lib/utils';
import { SplashScreen } from '@capacitor/splash-screen';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { Capacitor } from '@capacitor/core';
import { syncPreferencesToLocalStorage } from './lib/preferences';
import { preloadLogoForPDF, preloadBatikHeaderForPDF } from './services/pdfService';
import { ToastProvider } from './components/ui/Toast';
import { TooltipProvider } from './components/ui/tooltip';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import PushNotificationHandler from './components/PushNotificationHandler';
import NativeBackButtonHandler from './components/NativeBackButtonHandler';
import NativeAppListeners from './components/NativeAppListeners';
import ScrollToTopButton from './components/ScrollToTopButton';
import AppSplashScreen from './components/AppSplashScreen';
import { Skeleton } from './components/ui/Skeleton';
import LandingPage from './pages/LandingPage';
const OrderPage = lazy(() => import('./pages/OrderPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
import BottomNavigation from './components/BottomNavigation';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  
  return null;
}

// Smooth scroll handler for anchor links
function SmoothScrollHandler() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');

      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('#/')) {
          e.preventDefault();
          const el = document.querySelector(href);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}

// Guard component to ensure guest or authenticated user has explicitly started from LoginPage
function SessionGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      let isSessionStarted = false;
      let isGuestAllowed = false;

      try {
        isSessionStarted = sessionStorage.getItem('wawasan_session_started') === 'true';
        isGuestAllowed = sessionStorage.getItem('wawasan_guest_allowed') === 'true';
      } catch (err) {
        console.warn('sessionStorage unavailable (sandboxed environment):', err);
        isSessionStarted = true; // allow access in restricted sandboxes
      }
      
      // They MUST have started the session in this browser tab/window to be allowed.
      if (isSessionStarted && (user || isGuestAllowed)) {
        setAllowed(true);
      } else {
        setAllowed(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 space-y-6">
        <Skeleton className="w-24 h-24 rounded-full" />
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-8 w-3/4 mx-auto rounded-xl" />
          <Skeleton className="h-4 w-1/2 mx-auto rounded-lg" />
          <div className="pt-4 space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const { pathname } = location;
  const hideNavPaths = ['/', '/login'];
  const showNav = !hideNavPaths.includes(pathname);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      window.dispatchEvent(new CustomEvent('app:global-refresh'));
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  });

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <ScrollToTop />
      <SmoothScrollHandler />
      <ScrollToTopButton />

      {/* Global Pull-to-Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="fixed top-4 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-transform duration-150"
          style={{ transform: `translateY(${Math.min(pullDistance, 120)}px)` }}
        >
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg border border-amber-500/20 px-4 py-2 rounded-full flex items-center space-x-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <RefreshCw className={cn("w-4 h-4 text-amber-600 dark:text-amber-400", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? 'Refreshing app...' : pullDistance > 80 ? 'Release to refresh' : 'Pull down to refresh'}</span>
          </div>
        </div>
      )}

      <main className={cn("flex-grow", showNav && "pb-[calc(96px+env(safe-area-inset-bottom,16px))]")}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="w-full flex-grow"
          >
            <Suspense fallback={
              <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 space-y-6">
                <Skeleton className="w-24 h-24 rounded-full animate-pulse" />
                <div className="w-full max-w-sm space-y-3">
                  <Skeleton className="h-8 w-3/4 mx-auto rounded-xl animate-pulse" />
                  <Skeleton className="h-4 w-1/2 mx-auto rounded-lg animate-pulse" />
                </div>
              </div>
            }>
              <Routes location={location}>
                <Route path="/" element={<LoginPage />} />
                <Route path="/login" element={<LoginPage />} />
                
                {/* Client Routes protected by SessionGuard */}
                <Route 
                  path="/home" 
                  element={
                    <SessionGuard>
                      <LandingPage />
                    </SessionGuard>
                  } 
                />
                <Route 
                  path="/main" 
                  element={
                    <SessionGuard>
                      <LandingPage />
                    </SessionGuard>
                  } 
                />
                <Route 
                  path="/order" 
                  element={
                    <SessionGuard>
                      <OrderPage />
                    </SessionGuard>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <SessionGuard>
                      <ProfilePage />
                    </SessionGuard>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <SessionGuard>
                      <SettingsPage />
                    </SessionGuard>
                  } 
                />
                
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<LoginPage />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      {showNav && <BottomNavigation />}
    </div>
  );
}

function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Only clear session flags on cold start (no hash route yet), not on every remount
    const isColdStart = !window.location.hash || window.location.hash === '#/';
    if (isColdStart) {
      try {
        sessionStorage.removeItem('wawasan_session_started');
        sessionStorage.removeItem('wawasan_guest_allowed');
      } catch {
        // Ignore if sessionStorage is unavailable in restricted iframe/sandbox
      }
    }

    // Sync Capacitor Preferences to localStorage for synchronous access fallback
    syncPreferencesToLocalStorage();

    // Preload & scale the Restoran Wawasan logo and Batik header for the invoice PDF on idle
    const runWhenIdle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1000));
    runWhenIdle(() => {
      preloadLogoForPDF().catch(err => console.warn('Logo preloading failed:', err));
      preloadBatikHeaderForPDF().catch(err => console.warn('Batik header preloading failed:', err));
    });

    const hideSplash = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await SplashScreen.hide();
      } catch (err) {
        console.warn('SplashScreen hide warning:', err);
      } finally {
        setIsAppLoading(false);
      }
    };

    hideSplash();

    // Setup Safe Area CSS variables (especially for Android edge-to-edge)
    const setupSafeArea = async () => {
      // Set initial defaults for native platforms to prevent immediate overlap before plugin resolves
      if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        const defaultTopInset = platform === 'ios' ? '44px' : '28px';
        document.documentElement.style.setProperty('--safe-area-inset-top', defaultTopInset);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', '20px');
      }

      try {
        const { insets } = await SafeArea.getSafeAreaInsets();
        const platform = Capacitor.getPlatform();
        
        // If the plugin returns 0 but we are on native platform, use fallback defaults so they don't overlay
        const topInset = (insets.top === 0 && Capacitor.isNativePlatform()) 
          ? (platform === 'ios' ? 44 : 28) 
          : insets.top;
          
        const bottomInset = (insets.bottom === 0 && Capacitor.isNativePlatform())
          ? 20
          : insets.bottom;

        document.documentElement.style.setProperty('--safe-area-inset-top', `${topInset}px`);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', `${bottomInset}px`);
        document.documentElement.style.setProperty('--safe-area-inset-left', `${insets.left}px`);
        document.documentElement.style.setProperty('--safe-area-inset-right', `${insets.right}px`);

        const safeAreaListenerPromise = SafeArea.addListener('safeAreaChanged', data => {
          const { insets: newInsets } = data;
          const currentPlatform = Capacitor.getPlatform();
          const newTopInset = (newInsets.top === 0 && Capacitor.isNativePlatform())
            ? (currentPlatform === 'ios' ? 44 : 28)
            : newInsets.top;
            
          const newBottomInset = (newInsets.bottom === 0 && Capacitor.isNativePlatform())
            ? 20
            : newInsets.bottom;

          document.documentElement.style.setProperty('--safe-area-inset-top', `${newTopInset}px`);
          document.documentElement.style.setProperty('--safe-area-inset-bottom', `${newBottomInset}px`);
          document.documentElement.style.setProperty('--safe-area-inset-left', `${newInsets.left}px`);
          document.documentElement.style.setProperty('--safe-area-inset-right', `${newInsets.right}px`);
        });

        return safeAreaListenerPromise;
      } catch (err) {
        console.warn('SafeArea plugin error, using fallbacks:', err);
        if (Capacitor.isNativePlatform()) {
          const platform = Capacitor.getPlatform();
          document.documentElement.style.setProperty('--safe-area-inset-top', platform === 'ios' ? '44px' : '28px');
          document.documentElement.style.setProperty('--safe-area-inset-bottom', '20px');
        }
        return null;
      }
    };
    
    const listenerPromise = setupSafeArea();

    return () => {
      listenerPromise.then(handle => handle?.remove()).catch(() => {});
    };
  }, []);

  return (
    <>
      <AppSplashScreen isLoading={isAppLoading} />
      <TooltipProvider delayDuration={500}>
        <ToastProvider>
          <Router>
            <PushNotificationHandler />
            <NativeBackButtonHandler />
            <NativeAppListeners />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={!isAppLoading ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0 }}
              className="flex-grow flex flex-col w-full h-full"
            >
              <AppContent />
            </motion.div>
          </Router>
        </ToastProvider>
      </TooltipProvider>
    </>
  );
}

export default App;
