import { useEffect, useState, useRef, Suspense, ReactNode } from 'react';
import { useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import WawasanLoader from '@/components/WawasanLoader';
import { Skeleton } from '@/components/ui/Skeleton';
import { logScreenView, setAnalyticsUserId } from '@/services/analyticsService';
import { setCrashlyticsUserId } from '@/services/crashlyticsService';

// Components
import { OfflineBanner } from '@/components/OfflineBanner';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import BottomNavigation from '@/components/BottomNavigation';

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
          e.preventDefault();
          const el = document.querySelector(href);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      try {
        const isSessionStarted = sessionStorage.getItem('wawasan_session_started') === 'true';
        const isGuestAllowed = sessionStorage.getItem('wawasan_guest_allowed') === 'true';
        if (user || isSessionStarted || isGuestAllowed) {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
      } catch (err) {
        console.warn('Session storage check failed:', err);
        setAllowed(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-cream dark:bg-background flex flex-col items-center justify-center p-6 space-y-6">
      <Skeleton className="w-24 h-24 rounded-full" />
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="h-8 w-3/4 mx-auto rounded-xl" />
        <Skeleton className="h-4 w-1/2 mx-auto rounded-lg" />
      </div>
    </div>
  );

  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PageTransition({ children }: { children: ReactNode }) {
  const isNative = Capacitor.isNativePlatform();
  return (
    <motion.div
      initial={isNative ? { opacity: 0.95 } : { opacity: 0.88, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={isNative ? undefined : { opacity: 0.94 }}
      transition={{ duration: isNative ? 0.08 : 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="flex-grow flex flex-col w-full h-full relative"
    >
      {children}
    </motion.div>
  );
}

// Actual AppContent component
import React from 'react';

const LoginPageComp = React.lazy(() => import('@/pages/LoginPage'));
const LandingPageComp = React.lazy(() => import('@/pages/LandingPage'));
const OrderPageComp = React.lazy(() => import('@/pages/OrderPage'));
const AdminPageComp = React.lazy(() => import('@/pages/AdminPage'));
const ProfilePageComp = React.lazy(() => import('@/pages/ProfilePage'));
const SettingsPageComp = React.lazy(() => import('@/pages/SettingsPage'));
const CalendarPageComp = React.lazy(() => import('@/pages/CalendarPage'));

export default function AppContent() {
  const location = useLocation();
  const { pathname } = location;
  const [isAdmin, setIsAdmin] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setIsNavigating(true);
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 600); // 600ms delay to give time and show the loading logo
      prevPathnameRef.current = pathname;
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    const checkAdmin = () => {
      const isUserAdmin = localStorage.getItem('wawasan_admin_token') !== null || auth.currentUser?.uid === 'admin';
      setIsAdmin(isUserAdmin);
    };
    checkAdmin();
    window.addEventListener('admin:login-state-change', checkAdmin);
    window.addEventListener('storage', checkAdmin);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      checkAdmin();
      if (user) {
        setAnalyticsUserId(user.uid);
        setCrashlyticsUserId(user.uid);
      }
    });
    return () => {
      unsubscribe();
      window.removeEventListener('admin:login-state-change', checkAdmin);
      window.removeEventListener('storage', checkAdmin);
    };
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
    <div className="min-h-screen bg-cream dark:bg-background flex flex-col relative overflow-x-hidden">
      <OfflineBanner />
      <ScrollToTop />
      <SmoothScrollHandler />
      <ScrollToTopButton />

      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none pt-[calc(var(--sat)+1rem)]"
          style={{ transform: `translateY(${Math.min(pullDistance, 120)}px)` }}
        >
          <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-lg border border-amber-500/20 px-4 py-2 rounded-full flex items-center space-x-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <RefreshCw className={cn("w-4 h-4 text-amber-600 dark:text-amber-400", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? 'Refreshing app...' : pullDistance > 80 ? 'Release to refresh' : 'Pull down to refresh'}</span>
          </div>
        </div>
      )}

      <main className={cn("flex-grow relative", showNav && "pb-[calc(96px+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,16px)))]")}>
        {isNavigating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-cream/90 dark:bg-background/90 backdrop-blur-sm transition-opacity duration-300">
            <div className="flex flex-col items-center space-y-3">
              <WawasanLoader size={88} />
              <p className="text-xs font-semibold tracking-widest text-amber-800 dark:text-amber-400 uppercase animate-pulse">Memuatkan...</p>
            </div>
          </div>
        )}
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream dark:bg-background"><WawasanLoader size={80} /></div>}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><LoginPageComp /></PageTransition>} />
              <Route path="/login" element={<PageTransition><LoginPageComp /></PageTransition>} />
              <Route path="/home" element={<SessionGuard><PageTransition><LandingPageComp /></PageTransition></SessionGuard>} />
              <Route path="/main" element={<SessionGuard><PageTransition><LandingPageComp /></PageTransition></SessionGuard>} />
              <Route path="/order" element={<SessionGuard><PageTransition><OrderPageComp /></PageTransition></SessionGuard>} />
              <Route path="/profile" element={<SessionGuard><PageTransition><ProfilePageComp /></PageTransition></SessionGuard>} />
              <Route path="/settings" element={<SessionGuard><PageTransition><SettingsPageComp /></PageTransition></SessionGuard>} />
              <Route path="/calendar" element={<SessionGuard><PageTransition><CalendarPageComp /></PageTransition></SessionGuard>} />
              <Route path="/admin" element={<PageTransition><AdminPageComp /></PageTransition>} />
              <Route path="*" element={<PageTransition><LoginPageComp /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      {showNav && <BottomNavigation />}
    </div>
  );
}
