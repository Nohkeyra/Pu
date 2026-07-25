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
import AuthModal from '@/components/AuthModal';
import UserProfileDashboard from '@/components/UserProfileDashboard';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { motion } from 'motion/react';
import { triggerLightImpact } from '@/lib/haptics';

function BrandMark() {
  return (
    <img
      src={getAssetUrl("/assets/wawasan_logo.jpg")}
      alt="Restoran Wawasan Logo"
      className="w-10 h-10 object-contain shrink-0 mix-blend-multiply"
      referrerPolicy="no-referrer"
    />
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
    }
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
            scale: pullDistance > 10 || isRefreshing ? 1 : 0.8
          }}
        >
          <div className="bg-white dark:bg-card shadow-premium rounded-full p-2.5 border border-sunshine/20 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 text-sunshine ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 2}deg)` }} />
            {isRefreshing && <span className="text-[10px] font-black text-sunshine uppercase tracking-widest">Refreshing</span>}
          </div>
        </motion.div>

        <header className="fixed top-0 left-0 right-0 z-50 bg-cream/90 dark:bg-background/90 backdrop-blur-xl border-b border-border shadow-sm pt-[var(--sat)]">
          <div className="flex items-center justify-between px-6 md:px-12 h-[76px]">
            <div onClick={async () => { await triggerLightImpact(); navigate('/home', { replace: true }); }} className="flex items-center gap-3 group cursor-pointer">
              <BrandMark />
              <div>
                <span className="font-display font-semibold text-xl text-deep-forest leading-none tracking-tight">
                  Restoran Wawasan
                </span>
                <span className="block font-accent text-[10px] text-crisp-carrot uppercase tracking-[0.18em] leading-tight mt-0.5 font-bold">
                  Pak Usop
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={async () => { await triggerLightImpact(); toggleTheme(); }}
                className="p-2 md:p-3 rounded-full hover:bg-black/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sunshine/40"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-deep-forest" />
                ) : (
                  <Sun className="w-5 h-5 text-sunshine" />
                )}
              </button>

              <button
                onClick={async () => {
                  await triggerLightImpact();
                  if (currentUser) {
                    setProfileDashboardOpen(true);
                  } else {
                    setAuthModalOpen(true);
                  }
                }}
                className="p-2.5 text-deep-forest hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sunshine/40"
                aria-label={currentUser ? 'Account' : 'Sign in'}
              >
                <UserIcon className="w-5 h-5" />
              </button>

              <Button variant="ghost" onClick={async () => { await triggerLightImpact(); navigate('/home', { replace: true }); }} className="text-stone hover:text-crisp-carrot hover:bg-sunshine/10 rounded-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back')}
              </Button>
            </div>
          </div>
        </header>

        <motion.main 
          key={refreshKey}
          className="pt-[calc(76px+var(--sat)+2rem)] pb-16"
          animate={{ y: isRefreshing ? 60 : pullDistance * 0.5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 pt-10">
              <span className="inline-flex items-center gap-3 mb-5 px-4 py-2 rounded-full bg-sunshine/10 text-sunshine text-sm font-bold border border-sunshine/20">
                <span className="w-2 h-2 rounded-full bg-crisp-carrot animate-pulse" aria-hidden="true" />
                Online Ordering Available
              </span>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-deep-forest mb-4">
                Place Your Order
              </h1>
              <p className="text-stone max-w-2xl mx-auto font-medium">
                Enjoy authentic Malay cuisine for your events. Delivery available within Putrajaya area.
              </p>
            </div>

            <OrderForm initialData={initialData} />
          </div>
        </motion.main>

        <footer className="bg-charcoal border-t border-border py-8 mt-14">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-sunshine" />
              <span className="text-white text-xs tracking-[0.18em] uppercase font-semibold">
                Restoran Wawasan Pak Usop
              </span>
            </div>
            <p className="text-stone text-sm">
              © 2026 All rights reserved
            </p>
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
