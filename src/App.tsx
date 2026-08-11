import { useEffect, useState, Suspense, lazy, type ReactNode } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { motion } from "motion/react";
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
import { RefreshCw, AlertTriangle, Shield, User, Trash2, Home } from 'lucide-react';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import PushNotificationHandler from './components/PushNotificationHandler';
import NativeBackButtonHandler from './components/NativeBackButtonHandler';
import NativeAppListeners from './components/NativeAppListeners';
import InAppUpdateModal from './components/InAppUpdateModal';
import InAppUpdateBanner from './components/InAppUpdateBanner';
import { useInAppUpdates } from './hooks/useInAppUpdates';
import ScrollToTopButton from './components/ScrollToTopButton';
import CateringSplashScreen from './components/SplashScreen';
import { Skeleton } from './components/ui/Skeleton';
import { logScreenView, setAnalyticsUserId, setAnalyticsUserProperty } from './services/analyticsService';
import { setCrashlyticsUserId } from './services/crashlyticsService';

// Helper to retry dynamic imports if dynamic chunk fetching fails (e.g. during Vite dev server reloads or network hiccups)
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      console.warn('Dynamic chunk load failed, retrying once...', error);
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        return await factory();
      } catch (retryError) {
        console.error('Dynamic chunk retry failed, reloading page...', retryError);
        const reloaded = sessionStorage.getItem('chunk_retry_reload');
        if (!reloaded) {
          sessionStorage.setItem('chunk_retry_reload', 'true');
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
        sessionStorage.removeItem('chunk_retry_reload');
        throw retryError;
      }
    }
  });
}

const LandingPage  = lazyWithRetry(() => import('./pages/LandingPage'));
const OrderPage    = lazyWithRetry(() => import('./pages/OrderPage'));
const AdminPage    = lazyWithRetry(() => import('./pages/AdminPage'));
const LoginPage    = lazyWithRetry(() => import('./pages/LoginPage'));
const ProfilePage  = lazyWithRetry(() => import('./pages/ProfilePage'));
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage'));
const CalendarPage = lazyWithRetry(() => import('./pages/CalendarPage'));
import BottomNavigation from './components/BottomNavigation';

// Scroll to top on route change & log Analytics screen view
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    logScreenView(pathname || '/', 'AppPage');
  }, [pathname]);
  
  return null;
}

// Speed Insights wrapper to report SPA routes correctly with HashRouter
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

// Guard component to ensure guest, admin, or authenticated user can access application routes seamlessly
function SessionGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(() => {
    if (auth.currentUser) return false;
    try {
      if (sessionStorage.getItem('wawasan_session_started') === 'true' || sessionStorage.getItem('wawasan_guest_allowed') === 'true') {
        return false;
      }
    } catch {
      // Ignored
    }
    return false; // Default to false for instant tab switching without blank/skeleton screens
  });
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      try {
        sessionStorage.setItem('wawasan_session_started', 'true');
        sessionStorage.setItem('wawasan_guest_allowed', 'true');
      } catch {
        // Ignored
      }
      setAllowed(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background flex flex-col items-center justify-center p-6 space-y-6">
        <Skeleton className="w-24 h-24 rounded-full" />
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-8 w-3/4 mx-auto rounded-xl" />
          <Skeleton className="h-4 w-1/2 mx-auto rounded-lg" />
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
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return localStorage.getItem('wawasan_admin_token') !== null || auth.currentUser?.uid === 'admin';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isUserAdmin = user?.uid === 'admin' || localStorage.getItem('wawasan_admin_token') !== null;
      setIsAdmin(isUserAdmin);
      
      if (user) {
        setAnalyticsUserId(user.uid);
        setCrashlyticsUserId(user.uid);
        setAnalyticsUserProperty('user_role', isUserAdmin ? 'admin' : 'customer');
      } else {
        setAnalyticsUserId(null);
      }
    });

    try {
      sessionStorage.removeItem('wawasan_last_retry_route');
    } catch {
      // Ignored
    }

    return () => unsubscribe();
  }, []);

  const hideNavPaths = ['/', '/login', ...(isAdmin ? [] : ['/admin'])];
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

      <main className={cn("flex-grow", showNav && "pb-[calc(96px+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,16px)))]")}>
        <Suspense fallback={
          <div className="min-h-screen bg-[#151714] flex flex-col items-center justify-center p-6 space-y-6">
            <Skeleton className="w-24 h-24 rounded-full animate-pulse opacity-30" />
            <div className="w-full max-w-sm space-y-3">
              <Skeleton className="h-8 w-3/4 mx-auto rounded-xl animate-pulse opacity-20" />
              <Skeleton className="h-4 w-1/2 mx-auto rounded-lg animate-pulse opacity-20" />
            </div>
          </div>
        }>
          <div className="w-full flex-grow">
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
                <Route 
                  path="/calendar" 
                  element={
                    <SessionGuard>
                      <CalendarPage />
                    </SessionGuard>
                  } 
                />
                
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<LoginPage />} />
              </Routes>
            </div>
        </Suspense>
      </main>
      {showNav && <BottomNavigation />}
    </div>
  );
}

function FallbackDashboard({ onExit }: { onExit: () => void }) {
  const [stats, setStats] = useState({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    platform: Capacitor.getPlatform(),
    native: Capacitor.isNativePlatform(),
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setStats(prev => ({ ...prev, width: window.innerWidth, height: window.innerHeight }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      setStatusMsg('Semua cache, preferences, dan session storage telah dikosongkan!');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setStatusMsg('Gagal membersihkan cache: ' + String(err));
    }
  };

  const handleLaunchStandard = () => {
    try {
      localStorage.removeItem('wawasan_fallback_ui');
    } catch (err) {
      console.warn('Gagal memadam fallback preferences:', err);
    }
    onExit();
    window.location.reload();
  };

  const handleBypassSession = (role: 'guest' | 'admin') => {
    try {
      sessionStorage.setItem('wawasan_session_started', 'true');
      if (role === 'guest') {
        sessionStorage.setItem('wawasan_guest_allowed', 'true');
        window.location.hash = '#/home';
      } else {
        window.location.hash = '#/admin';
      }
      window.location.reload();
    } catch (err) {
      setStatusMsg('Gagal menetapkan session: ' + String(err));
    }
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-stone-950 p-6 flex flex-col justify-between font-body text-charcoal dark:text-stone-200">
      <div className="max-w-md mx-auto w-full space-y-8 pt-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[var(--color-sunshine-cta)]/15 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto border border-[var(--color-sunshine-cta)]/30">
            <AlertTriangle className="w-8 h-8 text-[var(--color-sunshine-cta)]" />
          </div>
          <h1 className="text-2xl font-black text-deep-forest dark:text-stone-50 tracking-tight uppercase">
            Wawasan <span className="text-[var(--color-sunshine-cta)]">Safe Mode</span>
          </h1>
          <p className="microcopy-14-upper text-stone">
            Diagnostic & Fallback Console
          </p>
          {statusMsg && (
            <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-medium text-center">
              {statusMsg}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-stone-900 border border-border p-5 rounded-3xl shadow-sm space-y-3">
          <h2 className="microcopy-14-upper font-bold text-deep-forest dark:text-amber-400">
            Sistem Diagnostik Semasa
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-cream dark:bg-stone-950 p-2.5 rounded-xl border border-border">
              <span className="block microcopy-12-upper text-stone font-bold">Status Internet</span>
              <span className={stats.online ? "text-emerald-600 font-bold" : "text-tomato-burst font-bold"}>
                {stats.online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div className="bg-cream dark:bg-stone-950 p-2.5 rounded-xl border border-border">
              <span className="block microcopy-12-upper text-stone font-bold">Platform</span>
              <span className="text-deep-forest dark:text-stone-300 font-bold uppercase">{stats.platform}</span>
            </div>
            <div className="bg-cream dark:bg-stone-950 p-2.5 rounded-xl border border-border">
              <span className="block microcopy-12-upper text-stone font-bold">Capacitor Native</span>
              <span className="text-deep-forest dark:text-stone-300 font-bold">{stats.native ? 'YES' : 'NO'}</span>
            </div>
            <div className="bg-cream dark:bg-stone-950 p-2.5 rounded-xl border border-border">
              <span className="block microcopy-12-upper text-stone font-bold">Dimensi Skrin</span>
              <span className="text-deep-forest dark:text-stone-300 font-bold">{stats.width}x{stats.height}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3.5">
          <button
            type="button"
            onClick={() => handleBypassSession('guest')}
            className="touch-target-row w-full min-h-[52px] px-5 bg-white dark:bg-stone-900 hover:bg-cream dark:hover:bg-stone-800 border border-border rounded-2xl font-bold flex items-center justify-between text-left shadow-sm transition-all duration-200"
          >
            <div>
              <span className="block text-sm text-deep-forest dark:text-stone-50">Log Masuk Pelanggan (Guest)</span>
              <span className="microcopy-14 text-stone font-medium">Bypass session guard dan buat tempahan catering</span>
            </div>
            <User className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
          </button>

          <button
            type="button"
            onClick={() => handleBypassSession('admin')}
            className="touch-target-row w-full min-h-[52px] px-5 bg-white dark:bg-stone-900 hover:bg-cream dark:hover:bg-stone-800 border border-border rounded-2xl font-bold flex items-center justify-between text-left shadow-sm transition-all duration-200"
          >
            <div>
              <span className="block text-sm text-deep-forest dark:text-stone-50">Panel Pentadbir (Admin)</span>
              <span className="microcopy-14 text-stone font-medium">Urus pesanan dan jana invois (RM)</span>
            </div>
            <Shield className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
          </button>

          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <button
              type="button"
              onClick={handleClearCache}
              className="touch-target-row min-h-[44px] py-3.5 px-4 bg-tomato-burst/10 hover:bg-tomato-burst/15 border border-tomato-burst/20 text-tomato-burst font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Reset App Cache
            </button>

            <button
              type="button"
              onClick={handleLaunchStandard}
              className="btn-cta touch-target-row min-h-[44px] py-3.5 px-4 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              Standard Mode
            </button>
          </div>
        </div>
      </div>

      <div className="text-center microcopy-12-upper text-stone/80 py-4">
        Restoran Wawasan v1.0 • Diagnostic Helper
      </div>
    </div>
  );
}

function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [useFallbackUi, setUseFallbackUi] = useState(() => {
    try {
      return localStorage.getItem('wawasan_fallback_ui') === 'true' || 
             window.location.search.includes('fallback=true') ||
             window.location.hash.includes('fallback=true');
    } catch {
      return false;
    }
  });
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    // Show troubleshooting fallback option if splash screen loading state remains active for more than 3 seconds
    const timer = setTimeout(() => {
      setShowTroubleshoot(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

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
      // Safety timeout: always resolve isAppLoading after maximum 1.8 seconds,
      // preventing a permanent hang if native plugins or bridges are stuck in sandboxed webviews.
      const safetyTimeout = setTimeout(() => {
        setIsAppLoading(false);
      }, 1800);

      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        if (Capacitor.isPluginAvailable('SplashScreen')) {
          await SplashScreen.hide();
        }
      } catch (err) {
        console.warn('SplashScreen hide warning:', err);
      } finally {
        clearTimeout(safetyTimeout);
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
              try {
                localStorage.setItem('wawasan_fallback_ui', 'true');
              } catch (err) {
                console.warn('Gagal menyimpan fallback preferences:', err);
              }
              setUseFallbackUi(true);
              setIsAppLoading(false);
              setIsSplashFinished(true);
            }}
            className="btn-cta touch-target-row min-h-[44px] px-6 py-3.5 font-bold rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
          >
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            Gunakan Fallback UI (Mod Diagnostik)
          </button>
          <p className="microcopy-14-upper text-stone dark:text-stone/80 mt-2.5 text-center max-w-xs font-semibold">
            Sesuai jika skrin lambat bertindak balas
          </p>
        </div>
      )}
      <TooltipProvider delayDuration={500}>
        <ToastProvider>
          <Router>
            <VercelSpeedInsights />
            <PushNotificationHandler />
            <NativeBackButtonHandler />
            <NativeAppListeners />
            <GlobalInAppUpdateHandler />
            <motion.div
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
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
