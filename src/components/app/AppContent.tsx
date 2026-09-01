import { useEffect, useState, Suspense, ReactNode } from 'react';
import { useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import WawasanLoader from '@/components/WawasanLoader';
import { RefreshCw } from 'lucide-react';
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

  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PageTransition({ children }: { children: ReactNode }) {
  const isNative = Capacitor.isNativePlatform();
  return (
    <motion.div
      initial={{ opacity: 0, y: isNative ? 4 : 8, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: isNative ? -4 : -6, scale: 0.995 }}
      transition={{ duration: isNative ? 0.12 : 0.2, ease: [0.22, 1, 0.36, 1] }}
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

function AppRoutes({ location }: { location: ReturnType<typeof useLocation> }) {
  return (
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
  );
}

export default function AppContent() {
  const location = useLocation();

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

      <main className="flex-grow relative pb-[calc(96px+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,16px)))]">
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream dark:bg-background"><WawasanLoader size={80} /></div>}>
          {/*
            BUG FIX (audit 2026-08-28): AnimatePresence mode="wait" defers
            mounting the new route until the outgoing route's exit animation
            reports completion. PageTransition sets exit={undefined} on
            native builds (Capacitor.isNativePlatform()) since no exit
            animation is used there — so on native, AnimatePresence was
            waiting on an exit signal that never meaningfully fires,
            combined with `key` living on a non-motion <Routes> wrapper and
            a single shared Suspense boundary for every lazy page. Confirmed
            on-device: tapping Home/Calendar/Settings while on /admin
            updated the URL and bottom-nav highlight, flashed the loading
            screen, then silently reverted to the old (admin) screen and
            stayed there — navigation looked like it worked but never
            actually completed. Since native never had a real exit
            animation to sequence in the first place, AnimatePresence's
            "wait" behavior provided no benefit there — only risk. Skipping
            it entirely on native (routes swap immediately, matching what
            the disabled exit already implied) removes that race outright.
            Web keeps AnimatePresence since it has a real exit animation to
            sequence.
          */}
          <AnimatePresence mode="wait">
            <AppRoutes location={location} key={location.pathname} />
          </AnimatePresence>
        </Suspense>
      </main>
      <BottomNavigation />
    </div>
  );
}
