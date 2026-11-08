import { useEffect, useState, Suspense, ReactNode } from 'react';
import { useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/ui/usePullToRefresh';
import WawasanLoader from '@/components/brand/WawasanLoader';
import { RefreshCw } from 'lucide-react';
import { logScreenView, setAnalyticsUserId } from '@/services/analyticsService';
import { setCrashlyticsUserId } from '@/services/crashlyticsService';

// Components
import { OfflineBanner } from '@/components/system/OfflineBanner';
import ScrollToTopButton from '@/components/layout/ScrollToTopButton';
import BottomNavigation from '@/components/layout/BottomNavigation';

// Helper components that were in App.tsx
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    logScreenView(pathname || '/', 'AppPage');
  }, [pathname]);
  return null;
}

function SmoothScrollHandler() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('#/')) {
          // Use the ID API: a valid fragment can contain CSS selector characters.
          // Let the browser handle unknown fragments natively.
          let id = href.slice(1);
          try { id = decodeURIComponent(id); } catch { /* Keep literal fragment. */ }
          const el = document.getElementById(id);
          if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          }
        }
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  return null;
}

function SessionGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkAccess = (user: unknown) => {
      try {
        const isSessionStarted = sessionStorage.getItem('wawasan_session_started') === 'true';
        const isGuestAllowed = sessionStorage.getItem('wawasan_guest_allowed') === 'true';
        const isAdmin = Boolean(
          localStorage.getItem('wawasan_admin_token') ||
          localStorage.getItem('wawasan_admin_authenticated') === 'true'
        );
        if (user || isSessionStarted || isGuestAllowed || isAdmin) {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
      } catch (err) {
        console.warn('Session storage check failed:', err);
        setAllowed(false);
      }
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      checkAccess(user);
    });

    const handleAdminChange = () => {
      checkAccess(auth.currentUser);
    };

    window.addEventListener('admin:login-state-change', handleAdminChange);
    window.addEventListener('storage', handleAdminChange);

    return () => {
      unsubscribe();
      window.removeEventListener('admin:login-state-change', handleAdminChange);
      window.removeEventListener('storage', handleAdminChange);
    };
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-cream dark:bg-background flex flex-col items-center justify-center p-6 space-y-3">
      <WawasanLoader size={80} />
      <p className="text-xs font-semibold tracking-widest text-amber-800 dark:text-amber-400 uppercase animate-pulse">Memuatkan...</p>
    </div>
  );

  if (!allowed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const isNative = Capacitor.isNativePlatform();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: isNative ? 4 : 8, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: isNative ? -4 : -6, scale: 0.995 }}
      transition={reduceMotion ? { duration: 0 } : { duration: isNative ? 0.12 : 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="flex-grow flex flex-col w-full h-full relative"
    >
      {children}
    </motion.div>
  );
}

// Actual AppContent component
import React, { Component } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { getNativeStartRoute } from '@/lib/appEntryRoutes';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  public state: RouteErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RouteErrorBoundary] Route module failed to load:', error, errorInfo);
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white dark:bg-card border border-amber-500/20 shadow-lg rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Gagal Memuatkan Halaman</h3>
              <p className="text-sm text-stone mt-1">
                Sambungan rangkaian atau pembaharuan aplikasi terganggu. Sila cuba muat semula modul ini.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--ui-action)] text-[var(--ui-on-action)] hover:brightness-105 font-medium text-sm transition-colors cursor-pointer min-h-[48px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-action)]"
              >
                Cuba Lagi
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-black/5 dark:hover:bg-white/5 text-foreground font-medium text-sm transition-colors cursor-pointer min-h-[48px]"
              >
                Muat Semula
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const LoginPageComp = lazyWithRetry(() => import('@/pages/LoginPage'), 'LoginPage');
const CustomerDashboardComp = lazyWithRetry(() => import('@/pages/CustomerDashboard'), 'CustomerDashboard');
const LandingPageComp = lazyWithRetry(() => import('@/pages/LandingPage'), 'LandingPage');
const OrderPageComp = lazyWithRetry(() => import('@/pages/OrderPage'), 'OrderPage');
const AdminPageComp = lazyWithRetry(() => import('@/pages/AdminPage'), 'AdminPage');
const ProfilePageComp = lazyWithRetry(() => import('@/pages/ProfilePage'), 'ProfilePage');
const SettingsPageComp = lazyWithRetry(() => import('@/pages/SettingsPage'), 'SettingsPage');
const CalendarPageComp = lazyWithRetry(() => import('@/pages/CalendarPage'), 'CalendarPage');

// The public URL keeps LandingPage. Native cold starts wait for Firebase session
// restoration before choosing Login, Customer Dashboard or Admin.
function AppEntry() {
  const isNative = Capacitor.isNativePlatform();
  const [ready, setReady] = useState(!isNative);
  const [customerSignedIn, setCustomerSignedIn] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCustomerSignedIn(Boolean(user));
      setReady(true);
    }, () => setReady(true));
    return unsubscribe;
  }, [isNative]);

  if (!isNative) return <PageTransition><LandingPageComp /></PageTransition>;
  if (!ready) return <div className="min-h-[50vh] flex items-center justify-center"><WawasanLoader size={80} /></div>;
  let hasAdminSession = false;
  try { hasAdminSession = Boolean(localStorage.getItem('wawasan_admin_token')); } catch { /* storage unavailable */ }
  return <Navigate to={getNativeStartRoute(customerSignedIn, hasAdminSession)} replace />;
}

function AppRoutes({ location }: { location: ReturnType<typeof useLocation> }) {
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<AppEntry />} />
      <Route path="/home" element={<AppEntry />} />
      <Route path="/main" element={<AppEntry />} />
      <Route path="/app" element={<PageTransition><CustomerDashboardComp /></PageTransition>} />
      <Route path="/order" element={<PageTransition><OrderPageComp /></PageTransition>} />
      <Route path="/login" element={<PageTransition><LoginPageComp /></PageTransition>} />
      <Route path="/profile" element={<SessionGuard><PageTransition><ProfilePageComp /></PageTransition></SessionGuard>} />
      <Route path="/settings" element={<SessionGuard><PageTransition><SettingsPageComp /></PageTransition></SessionGuard>} />
      <Route path="/calendar" element={<SessionGuard><PageTransition><CalendarPageComp /></PageTransition></SessionGuard>} />
      <Route path="/admin" element={<PageTransition><AdminPageComp /></PageTransition>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function AppContent() {
  const location = useLocation();
  const isStandaloneScreen = location.pathname === '/login' || (!Capacitor.isNativePlatform() && ['/', '/home', '/main'].includes(location.pathname));
  // Presentation marker only: native customer screens manage their own dock clearance.
  const isCustomerScreen = ['/app', '/order', '/profile', '/calendar', '/settings'].includes(location.pathname);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAnalyticsUserId(user.uid);
        setCrashlyticsUserId(user.uid);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      window.dispatchEvent(new CustomEvent('app:global-refresh'));
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  });

  return (
    <div className={cn('min-h-screen bg-cream dark:bg-background flex flex-col relative', location.pathname === '/order' ? 'overflow-x-clip' : 'overflow-x-hidden')}>
      {/* Accessible Skip Link for Screen Readers and Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2.5 focus:bg-[var(--ui-action)] focus:text-[var(--ui-on-action)] focus:font-bold focus:rounded-xl focus:shadow-2xl focus:ring-4 focus:ring-[var(--ui-orange)] focus:outline-none transition-all min-h-[48px] inline-flex items-center"
      >
        Skip to main content / Langkau ke kandungan utama
      </a>

      <OfflineBanner />
      <ScrollToTop />
      <SmoothScrollHandler />
      <ScrollToTopButton />

      <motion.div 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none pt-[calc(var(--sat)+1rem)]"
        initial={reduceMotion ? false : { opacity: 0, y: -20, scale: 0.8 }}
        animate={reduceMotion
          ? { opacity: pullDistance > 10 || isRefreshing ? 1 : 0, y: 0, scale: 1 }
          : {
              opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
              y: isRefreshing ? 20 : Math.max(0, Math.min(pullDistance - 40, 20)),
              scale: pullDistance > 10 || isRefreshing ? 1 : 0.8
            }}
        transition={reduceMotion ? { duration: 0 } : undefined}
      >
        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-lg border border-amber-500/20 px-4 py-2 rounded-full flex items-center space-x-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          <RefreshCw className={cn("w-4 h-4 text-amber-600 dark:text-amber-400", isRefreshing && "animate-spin")} />
          <span>{isRefreshing ? 'Refreshing app...' : pullDistance > 80 ? 'Release to refresh' : 'Pull down to refresh'}</span>
        </div>
      </motion.div>

      <main id="main-content" tabIndex={-1} className={cn('flex-grow relative focus:outline-none', isCustomerScreen && 'wawasan-customer-main', !isStandaloneScreen && 'pb-[calc(96px+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,16px)))]')}>
        <RouteErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream dark:bg-background"><WawasanLoader size={80} /></div>}>
            <AnimatePresence mode="wait">
              <AppRoutes location={location} key={location.pathname} />
            </AnimatePresence>
          </Suspense>
        </RouteErrorBoundary>
      </main>
      {!isStandaloneScreen && <BottomNavigation />}
    </div>
  );
}
