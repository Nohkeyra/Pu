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
        src={getAssetUrl('/assets/wawasan_logo.svg')}
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
      <div className="min-h-screen bg-cream dark:bg-background pattern-dots">
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
                <span className="font-display font-semibold text-xl page-header-text leading-none tracking-tight">
                  Restoran Wawasan
                </span>
                <span className="microcopy-12-upper block text-[var(--color-sunshine-cta)] leading-tight mt-0.5">
                  Pak Usop
                </span>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await triggerLightImpact();
                  toggleTheme();
                }}
                className="icon-button-soft touch-target"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await triggerLightImpact();
                  if (currentUser) {
                    setProfileDashboardOpen(true);
                  } else {
                    setAuthModalOpen(true);
                  }
                }}
                className="icon-button-soft touch-target"
                aria-label={currentUser ? 'Account' : 'Sign in'}
              >
                {currentUser ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-sunshine-cta)] microcopy-12 font-black text-white">
                    {currentUser.displayName?.slice(0, 2).toUpperCase() ||
                      currentUser.email?.slice(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <UserIcon className="w-5 h-5" />
                )}
              </button>

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
          className="page-shell__main pt-[calc(76px+var(--sat)+2rem)] pb-[calc(140px+env(safe-area-inset-bottom,16px))] lg:pb-16"
          animate={{ y: isRefreshing ? 60 : pullDistance * 0.5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        >
          <OrderForm initialData={initialData} />
        </motion.main>

        <footer className="bg-charcoal border-t border-border pt-8 pb-[calc(100px+env(safe-area-inset-bottom,16px))] mt-14">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-sunshine-cta)]" />
              <span className="text-white text-xs tracking-[0.18em] uppercase font-semibold">
                Restoran Wawasan Pak Usop
              </span>
            </div>
            <p className="text-stone text-sm">© 2026 All rights reserved</p>
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
