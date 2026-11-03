import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import OrderForm from '@/components/order/OrderForm';
import { ErrorBoundary } from '@/components/system/ErrorBoundary';
import { CustomerPageHeader } from '@/components/layout/CustomerPageHeader';
import CustomerPageLayout from '@/components/layout/CustomerPageLayout';
import AuthModal from '@/components/auth/AuthModal';
import UserProfileDashboard from '@/components/profile/UserProfileDashboard';
import { usePullToRefresh } from '@/hooks/ui/usePullToRefresh';
import { motion } from 'motion/react';

export default function OrderPage() {
  const { language } = useLanguage();
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
    <CustomerPageLayout className="customer-order-page relative">
        {/* Pull to Refresh Indicator */}
        <motion.div
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none pt-[calc(var(--sat)+1rem)]"
          animate={{
            y: isRefreshing ? 20 : Math.max(0, Math.min(pullDistance - 40, 20)),
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

        <CustomerPageHeader
          backDestination="home"
          title={language === 'bm' ? 'Tempah katering' : 'Catering order'}
          subtitle={language === 'bm' ? 'Butiran majlis anda' : 'Your event details'}
          onBack={() => navigate('/home', { replace: true })}
          actions={[
            { label: currentUser ? (language === 'bm' ? 'Akaun anda' : 'Your account') : (language === 'bm' ? 'Log masuk' : 'Sign in'), onSelect: () => {
              if (!currentUser) { setAuthModalOpen(true); return; }
              const admin = currentUser.uid === 'admin' || localStorage.getItem('wawasan_admin_token') !== null;
              if (admin) navigate('/admin'); else setProfileDashboardOpen(true);
            } },
            { label: language === 'bm' ? 'Tetapan' : 'Settings', onSelect: () => navigate('/settings') },
            { label: language === 'bm' ? 'Halaman utama' : 'Home', onSelect: () => navigate('/home') },
          ]}
        />

        <motion.div
          key={refreshKey}
          className="customer-content relative"
          animate={{ y: isRefreshing ? 60 : pullDistance * 0.5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        >
          <OrderForm initialData={initialData} />
        </motion.div>


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
      </CustomerPageLayout>
    </ErrorBoundary>
  );
}
