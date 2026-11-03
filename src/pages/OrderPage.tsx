import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import OrderForm from '@/components/OrderForm';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CustomerPageHeader } from '@/components/CustomerPageHeader';
import CustomerPageLayout from '@/components/CustomerPageLayout';
import AuthModal from '@/components/AuthModal';
import UserProfileDashboard from '@/components/UserProfileDashboard';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
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
    <CustomerPageLayout
      className="customer-order-page relative"
      preFooterDecoration={
        <div className="wawasan-order-footer-flower" aria-hidden="true">
          <svg className="wawasan-batik-flower wawasan-batik-flower--right" viewBox="0 0 220 170" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(220 0) scale(-1 1)" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round">
              <path d="M0 85 Q55 54 112 80 T220 73" opacity=".75"/>
              <path d="M52 78 C22 54 27 25 52 13 C68 39 65 61 52 78Z" fill="var(--wawasan-leaf)" stroke="var(--wawasan-leaf-edge)"/>
              <path d="M52 78 Q46 42 52 13" stroke="var(--wawasan-leaf-vein)" strokeWidth="1"/>
              <path d="M66 83 C80 46 107 39 122 53 C111 77 88 89 66 83Z" fill="var(--wawasan-leaf)" stroke="var(--wawasan-leaf-edge)"/>
              <path d="M66 83 Q93 66 122 53" stroke="var(--wawasan-leaf-vein)" strokeWidth="1"/>
              <g transform="translate(54 91)">
                {Array.from({ length: 6 }, (_, i) => (
                  <path key={i} d="M0-32 C-13-48-21-21 0-6 C21-21 13-48 0-32Z" fill="var(--wawasan-flower)" transform={`rotate(${i * 60})`} />
                ))}
                <circle r="6" fill="var(--wawasan-flower-core)"/>
              </g>
              <path d="M89 112q36 10 44-15t-14-19q-14 7-1 15" strokeDasharray="2 5" strokeLinecap="round"/>
            </g>
          </svg>
        </div>
      }
    >
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

        {/* Decorative only: batik florals and small leaves, behind the order form. */}
        <div className="customer-botanical-decoration" aria-hidden="true">
          <svg className="wawasan-batik-flower wawasan-batik-flower--left" viewBox="0 0 220 170" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round">
              <path d="M0 85 Q55 54 112 80 T220 73" opacity=".75" />
              <path d="M52 78 C22 54 27 25 52 13 C68 39 65 61 52 78Z" fill="var(--wawasan-leaf)" stroke="var(--wawasan-leaf-edge)"/>
              <path d="M52 78 Q46 42 52 13" stroke="var(--wawasan-leaf-vein)" strokeWidth="1"/>
              <path d="M66 83 C80 46 107 39 122 53 C111 77 88 89 66 83Z" fill="var(--wawasan-leaf)" stroke="var(--wawasan-leaf-edge)"/>
              <path d="M66 83 Q93 66 122 53" stroke="var(--wawasan-leaf-vein)" strokeWidth="1"/>
              <g transform="translate(54 91)">
                <path d="M0-32 C-13-48-21-21 0-6 C21-21 13-48 0-32Z M0-32 C-13-48-21-21 0-6 C21-21 13-48 0-32Z" fill="var(--wawasan-flower)"/>
                <path d="M0-32 C-13-48-21-21 0-6 C21-21 13-48 0-32Z" fill="var(--wawasan-flower)" transform="rotate(60)"/>
                <path d="M0-32 C-13-48-21-21 0-6 C21-21 13-48 0-32Z" fill="var(--wawasan-flower)" transform="rotate(120)"/>
                <path d="M0-32 C-13-48-21-21 0-6 C21-21 13-48 0-32Z" fill="var(--wawasan-flower)" transform="rotate(180)"/>
                <path d="M0-32 C-13-48-21-21 0-6 C21-21 13-48 0-32Z" fill="var(--wawasan-flower)" transform="rotate(240)"/>
                <path d="M0-32 C-13-48-21-21 0-6 C21-21 13-48 0-32Z" fill="var(--wawasan-flower)" transform="rotate(300)"/>
                <circle r="6" fill="var(--wawasan-flower-core)"/>
              </g>
              <path d="M89 112q36 10 44-15t-14-19q-14 7-1 15" strokeDasharray="2 5" strokeLinecap="round"/>
            </g>
          </svg>
          <svg className="wawasan-batik-wave" viewBox="0 0 800 65" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" fill="none">
            <path d="M0 14 C170 52 270 68 430 37 S690 10 800 30" stroke="currentColor" strokeWidth="2"/>
            <path d="M0 21 C170 59 270 75 430 44 S690 17 800 37" stroke="currentColor" strokeWidth=".8" opacity=".45"/>
          </svg>
        </div>

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
