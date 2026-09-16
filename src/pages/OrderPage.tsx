import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sun, Moon, User as UserIcon, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import OrderForm from '@/components/OrderForm';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getAssetUrl } from '@/lib/utils';
import { TransparentLogo } from '@/components/TransparentLogo';
import AuthModal from '@/components/AuthModal';
import UserProfileDashboard from '@/components/UserProfileDashboard';
import { Batik3DMotion } from '@/components/Batik3DMotion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { motion } from 'motion/react';
import { triggerLightImpact } from '@/lib/haptics';

function BrandMark() {
  return (
    <div className="h-10 w-10 flex items-center justify-center">
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
  );
}

export default function OrderPage() {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const initialData = location.state?.reorderData;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileDashboardOpen, setProfileDashboardOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      // Just simulate a refresh by incrementing key to remount OrderForm or similar
      setRefreshKey(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 800));
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cream dark:bg-background pattern-dots relative">
        {/* Pull to Refresh Indicator */}
        <motion.div
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none pt-[calc(var(--sat)+1rem)]"
          animate={{
            y: isRefreshing ? 20 : Math.min(pullDistance - 40, 20),
            opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
            scale: pullDistance > 10 || isRefreshing ? 1 : 0.8,
          }}
        >
          <div className="bg-white dark:bg-card shadow-premium rounded-full p-2.5 border border-[var(--color-sunshine-cta)]/20 flex items-center gap-2">
            <RefreshCw
              className={`w-4 h-4 text-[var(--color-sunshine-cta)] ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 2}deg)` }}
            />
            {isRefreshing && (
              <span className="microcopy-12-upper text-[var(--color-sunshine-cta)]">
                Refreshing
              </span>
            )}
          </div>
        </motion.div>

        {/*
          P0 — standardised dark-mode text colour override so header
          label and "Pak Usop" eyebrow stay legible on dark surfaces.
        */}
        <header className="glass-header fixed top-0 left-0 right-0 z-50 pt-[var(--sat)]">
          <div className="flex items-center justify-between px-4 sm:px-6 md:px-12 min-h-[60px] sm:min-h-[64px]">
            {/**
             * DESIGN-SYSTEM-EXCEPTION: Brand Nav Wrapper
             * Semantic multi-line logo & identity header touch target navigating to /home.
             * Not a standard action button; exempt from <Button> primitive migration.
             */}
            <button
              type="button"
              onClick={async () => {
                await triggerLightImpact();
                navigate('/home', { replace: true });
              }}
              className="touch-target-row flex items-center gap-3 group text-left"
              aria-label="Go to home"
            >
              <BrandMark />
              <div>
                <span className="font-artistic text-base sm:text-xl page-header-text leading-none tracking-tight block">
                  Restoran Wawasan
                </span>
                <span className="microcopy-12-upper block text-[var(--color-sunshine-cta)] leading-tight mt-0.5 font-semibold">
                  Pak Usop
                </span>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await triggerLightImpact();
                  toggleTheme();
                }}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await triggerLightImpact();
                  if (currentUser) {
                    const isAdmin = currentUser.uid === 'admin' || localStorage.getItem('wawasan_admin_token') !== null;
                    if (isAdmin) {
                      navigate('/admin');
                    } else {
                      setProfileDashboardOpen(true);
                    }
                  } else {
                    setAuthModalOpen(true);
                  }
                }}
                aria-label={currentUser ? 'Account' : 'Sign in'}
              >
                {currentUser ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-sunshine-cta)] microcopy-12 font-black text-white">
                    {(currentUser.displayName?.slice(0, 2) || currentUser.email?.slice(0, 2) || (currentUser.uid === 'admin' ? 'AD' : 'US')).toUpperCase()}
                  </div>
                ) : (
                  <UserIcon className="w-5 h-5" />
                )}
              </Button>

              {/* P0 — semantic back button + 44 px tap target. */}
              <Button
                variant="ghost"
                onClick={async () => {
                  await triggerLightImpact();
                  navigate('/home', { replace: true });
                }}
                className="touch-target-row text-stone hover:text-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta)]/10 rounded-full min-h-[44px]"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back')}
              </Button>
            </div>
          </div>
        </header>

        <motion.main
          key={refreshKey}
          className="page-shell__main pt-20 sm:pt-24 pb-[calc(140px+env(safe-area-inset-bottom,16px))] relative"
          style={{ paddingTop: 'calc(72px + var(--sat, 0px) + 1rem)' }}
          animate={{ y: isRefreshing ? 60 : pullDistance * 0.5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        >
          <OrderForm initialData={initialData} />
        </motion.main>

        <footer className="bg-deep-forest dark:bg-card border-t border-amber-500/20 pt-10 pb-[calc(110px+env(safe-area-inset-bottom,16px))] mt-14 relative overflow-hidden">
          {/* Cinematic Deep Dark Batik Background Layer (Matching HeroSection) */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-deep-forest dark:bg-card pointer-events-none">
            {/* Dynamic Atmospheric Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-deep-forest/90 via-deep-forest/65 to-deep-forest dark:from-card/95 dark:via-card/75 dark:to-card z-0" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0c453c]/35 via-transparent to-amber-950/20 dark:from-[#101915]/60 dark:to-transparent z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(10,28,24,0.6)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(12,16,14,0.8)_100%)] z-0" />

            {/* Traditional Malaysian Batik Vector Pattern Background Layer */}
            <Batik3DMotion
              mode="background"
              src={getAssetUrl('/assets/heritage/batik_vector_pattern.jpg')}
              backgroundSize="cover"
              backgroundRepeat="no-repeat"
              maxRotation={12}
              imgClassName="opacity-25 dark:opacity-[0.14] dark:contrast-105 dark:brightness-85 dark:saturate-[0.85] transition-opacity duration-700 pointer-events-none"
            />

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 pattern-dots opacity-10 [mask-image:radial-gradient(circle_at_center,black_30%,transparent_90%)] pointer-events-none z-10" />
          </div>

          <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-sunshine-cta)] shadow-[0_0_8px_rgba(246,153,19,0.8)]" />
              <span className="text-white text-xs tracking-[0.18em] uppercase font-semibold">
                Restoran Wawasan Pak Usop
              </span>
            </div>
            <p className="text-amber-100/70 dark:text-stone-400 text-xs sm:text-sm">© 2026 All rights reserved</p>
          </div>
        </footer>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => setProfileDashboardOpen(true)}
        />

        <UserProfileDashboard
          isOpen={profileDashboardOpen}
          onClose={() => setProfileDashboardOpen(false)}
          onReorder={(orderData) => {
            navigate('/order', { state: { reorderData: orderData } });
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
