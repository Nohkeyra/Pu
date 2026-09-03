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
  if (pathname.startsWith('/admin')) return adminFlag ? 'admin' : null;
  if (pathname.startsWith('/profile')) return !adminFlag ? 'profile' : null;
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
}

// Prefetch chunk on hover / touchstart for instant navigation
function prefetchTabModule(path: string) {
  try {
    if (path.includes('order')) {
      import('../pages/OrderPage').catch(() => {});
    } else if (path.includes('calendar')) {
      import('../pages/CalendarPage').catch(() => {});
    } else if (path.includes('profile')) {
      import('../pages/ProfilePage').catch(() => {});
    } else if (path.includes('settings')) {
      import('../pages/SettingsPage').catch(() => {});
    } else if (path.includes('admin')) {
      import('../pages/AdminPage').catch(() => {});
    } else if (path.includes('home') || path.includes('main')) {
      import('../pages/LandingPage').catch(() => {});
    }
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
    const checkAdmin = () => {
      const isUserAdmin = localStorage.getItem('wawasan_admin_token') !== null || auth.currentUser?.uid === 'admin';
      setIsAdmin(isUserAdmin);
    };
    checkAdmin();

    const unsubscribe = onAuthStateChanged(auth, () => {
      checkAdmin();
    });

    window.addEventListener('admin:login-state-change', checkAdmin);
    window.addEventListener('storage', checkAdmin);
    return () => {
      unsubscribe();
      window.removeEventListener('admin:login-state-change', checkAdmin);
      window.removeEventListener('storage', checkAdmin);
    };
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
      label: isAdmin ? (t('nav_admin') || 'Admin') : t('nav_profile'),
      path: isAdmin ? '/admin' : '/profile',
    },
    { id: 'calendar', icon: Calendar, label: t('nav_calendar'), path: '/calendar' },
    { id: 'settings', icon: Settings, label: t('nav_settings'), path: '/settings' },
  ], [isAdmin, t]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex justify-center">
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="pointer-events-auto w-full max-w-xl border-t sm:border-x border-deep-forest/15 bg-white/95 sm:rounded-t-[2rem] shadow-[0_-12px_30px_rgba(12,69,60,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-card/95"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
          isolation: 'isolate',
        }}
      >
        <nav className="relative z-10 mx-auto flex h-[68px] sm:h-[72px] w-full items-center justify-around px-1.5 sm:px-4">
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
                'relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[44px] px-1 sm:px-2 select-none cursor-pointer',
                isActive ? 'text-[var(--color-sunshine-cta)]' : 'text-[var(--color-stone)] hover:text-deep-forest dark:hover:text-[#ede5d8]'
              )}
            >
              <div className="relative flex h-8 sm:h-9 w-12 sm:w-14 items-center justify-center shrink-0">
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-full border border-[var(--color-sunshine-cta)]/25 bg-[var(--color-sunshine-cta)]/12 dark:bg-[var(--color-sunshine-cta)]/18 shadow-[0_2px_12px_rgba(246,153,19,0.15)]"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <motion.div
                  initial={false}
                  animate={isActive ? { scale: 1.1, y: -0.5 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 26 }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </motion.div>
              </div>

              <motion.span
                initial={false}
                animate={isActive ? { y: 0, opacity: 1 } : { y: 0.5, opacity: 0.85 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={cn(
                  'nav-label relative z-10 transition-colors duration-200 text-[10px] sm:text-[11px] leading-tight tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-0.5',
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
    </div>
  );
}

