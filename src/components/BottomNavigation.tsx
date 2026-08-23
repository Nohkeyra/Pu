import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Utensils, Settings, User, Shield, Calendar } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { auth } from '@/firebaseConfig';
import { triggerLightImpact } from '@/lib/haptics';
import { onAuthStateChanged } from 'firebase/auth';

// Helper to determine tab ID from pathname
function getTabIdFromPath(pathname: string, adminFlag: boolean): string | null {
  if (pathname === '/' || pathname === '/home' || pathname === '/main') return 'home';
  if (pathname.startsWith('/order')) return 'order';
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/admin') && adminFlag) return 'admin';
  if (pathname.startsWith('/profile')) return adminFlag ? 'admin' : 'profile';
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
}

// Prefetch chunk on hover / touchstart for instant navigation
function prefetchTabModule(path: string) {
  try {
    if (path.includes('order')) import('../pages/OrderPage');
    else if (path.includes('calendar')) import('../pages/CalendarPage');
    else if (path.includes('profile')) import('../pages/ProfilePage');
    else if (path.includes('settings')) import('../pages/SettingsPage');
    else if (path.includes('admin')) import('../pages/AdminPage');
    else if (path.includes('home') || path.includes('main')) import('../pages/LandingPage');
  } catch {
    // Best-effort prefetch
  }
}

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return localStorage.getItem('wawasan_admin_token') !== null || auth.currentUser?.uid === 'admin';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(user?.uid === 'admin' || localStorage.getItem('wawasan_admin_token') !== null);
    });
    return () => unsubscribe();
  }, []);

  const currentTabId = useMemo(
    () => getTabIdFromPath(location.pathname, isAdmin),
    [location.pathname, isAdmin]
  );

  const tabs = useMemo(() => [
    { id: 'home', icon: Home, label: t('nav_home'), path: '/home' },
    { id: 'order', icon: Utensils, label: t('nav_order'), path: '/order' },
    {
      id: isAdmin ? 'admin' : 'profile',
      icon: isAdmin ? Shield : User,
      label: isAdmin ? t('nav_admin') : t('nav_profile'),
      path: isAdmin ? '/admin' : '/profile',
    },
    { id: 'calendar', icon: Calendar, label: t('nav_calendar'), path: '/calendar' },
    { id: 'settings', icon: Settings, label: t('nav_settings'), path: '/settings' },
  ], [isAdmin, t]);

  const showNav = ['/', '/home', '/main', '/order', '/calendar', '/profile', '/settings', ...(isAdmin ? ['/admin'] : [])].some(
    (p) => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );

  if (!showNav) return null;

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl z-[100] border-t md:border-x md:border-t border-deep-forest/15 bg-white/95 md:rounded-t-[2rem] shadow-[0_-12px_30px_rgba(12,69,60,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-card/95"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 6px)',
        isolation: 'isolate',
      }}
    >
      <nav className="relative z-10 mx-auto flex h-[74px] max-w-xl items-center justify-around px-3 sm:px-6">
        {tabs.map((tab) => {
          const isActive = currentTabId === tab.id;
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.93 }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              onMouseEnter={() => prefetchTabModule(tab.path)}
              onTouchStart={() => prefetchTabModule(tab.path)}
              onFocus={() => prefetchTabModule(tab.path)}
              onClick={() => {
                if (isActive) return;
                triggerLightImpact();
                try {
                  sessionStorage.setItem('wawasan_session_started', 'true');
                  sessionStorage.setItem('wawasan_guest_allowed', 'true');
                } catch (storageErr) {
                  console.warn('SessionStorage unavailable:', storageErr);
                }
                navigate(tab.path);
              }}
              className={cn(
                'relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[44px] px-2 select-none cursor-pointer',
                isActive ? 'text-[var(--color-sunshine-cta)]' : 'text-[var(--color-stone)] hover:text-deep-forest dark:hover:text-[#ede5d8]'
              )}
            >
              <div className="relative flex h-9 w-16 items-center justify-center">
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-full border border-[var(--color-sunshine-cta)]/25 bg-[var(--color-sunshine-cta)]/12 dark:bg-[var(--color-sunshine-cta)]/18 shadow-[0_2px_12px_rgba(246,153,19,0.15)]"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <motion.div
                  initial={false}
                  animate={isActive ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 26 }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
              </div>

              <motion.span
                initial={false}
                animate={isActive ? { y: 0, opacity: 1 } : { y: 1, opacity: 0.85 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={cn(
                  'nav-label relative z-10 transition-colors duration-200 text-[10px] sm:text-[11px] leading-none tracking-wide whitespace-nowrap',
                  isActive
                    ? 'nav-label-active text-[var(--color-sunshine-cta)] font-bold'
                    : 'nav-label-inactive text-deep-forest/80 dark:text-[#ede5d8]/80 font-medium'
                )}
              >
                {tab.label}
              </motion.span>
            </motion.button>
          );
        })}
      </nav>
    </motion.div>
  );
}

