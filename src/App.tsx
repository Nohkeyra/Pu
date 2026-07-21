import { useEffect, useState, type ReactNode } from 'react';
import { motion } from "motion/react";
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { cn } from '@/lib/utils';
import { SplashScreen } from '@capacitor/splash-screen';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { Capacitor } from '@capacitor/core';
import { syncPreferencesToLocalStorage } from '@/lib/preferences';
import { preloadLogoForPDF } from '@/services/pdfService';
import { LanguageProvider } from '@/context/LanguageContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import PushNotificationHandler from '@/components/PushNotificationHandler';
import NativeBackButtonHandler from '@/components/NativeBackButtonHandler';
import NativeAppListeners from '@/components/NativeAppListeners';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import AppSplashScreen from '@/components/AppSplashScreen';
import { Skeleton } from '@/components/ui/Skeleton';
import LandingPage from '@/pages/LandingPage';
import OrderPage from '@/pages/OrderPage';
import AdminPage from '@/pages/AdminPage';
import LoginPage from '@/pages/LoginPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import BottomNavigation from '@/components/BottomNavigation';

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
      const isSessionStarted = sessionStorage.getItem('wawasan_session_started') === 'true';
      const isGuestAllowed = sessionStorage.getItem('wawasan_guest_allowed') === 'true';
      
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
  const { pathname } = useLocation();
  const hideNavPaths = ['/', '/login'];
  const showNav = !hideNavPaths.includes(pathname);

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <SmoothScrollHandler />
      <ScrollToTopButton />
      <main className={cn("flex-grow", showNav && "pb-20")}>
        <Routes>
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
        
        <Route path="/admin" element={<SessionGuard><AdminPage /></SessionGuard>} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
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
      sessionStorage.removeItem('wawasan_session_started');
      sessionStorage.removeItem('wawasan_guest_allowed');
    }

    // Force route back to the startup screen /#/ on load or refresh

    // Sync Capacitor Preferences to localStorage for synchronous access fallback
    syncPreferencesToLocalStorage();

    // Preload & scale the Restoran Wawasan logo for the invoice PDF
    preloadLogoForPDF().catch(err => console.warn('Logo preloading failed:', err));

    const hideSplash = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        await SplashScreen.hide();
      } catch {
        // Not running in a Capacitor container (plain web browser) — silently skip
      }
      setIsAppLoading(false);
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
      listenerPromise.then(handle => handle?.remove());
    };
  }, []);

  return (
    <ThemeProvider>
      <AppSplashScreen isLoading={isAppLoading} />
      <SettingsProvider>
        <LanguageProvider>
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
        </LanguageProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
