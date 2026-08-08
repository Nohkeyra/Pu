import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Utensils, Settings, User, Shield } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { auth } from '@/firebaseConfig';
import { triggerLightImpact } from '@/lib/haptics';
import { onAuthStateChanged } from 'firebase/auth';

// Helper to determine tab ID from pathname
function getTabIdFromPath(pathname: string, adminFlag: boolean): string | null {
  if (pathname === '/' || pathname === '/home' || pathname === '/main') return 'home';
  if (pathname.startsWith('/order')) return 'order';
  if (pathname.startsWith('/admin') && adminFlag) return 'admin';
  if (pathname.startsWith('/profile')) return adminFlag ? 'admin' : 'profile';
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
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

  const tabs = [
    { id: 'home', icon: Home, label: t('nav_home'), path: '/home' },
    { id: 'order', icon: Utensils, label: t('nav_order'), path: '/order' },
    {
      id: isAdmin ? 'admin' : 'profile',
      icon: isAdmin ? Shield : User,
      label: isAdmin ? t('nav_admin') : t('nav_profile'),
      path: isAdmin ? '/admin' : '/profile',
    },
    { id: 'settings', icon: Settings, label: t('nav_settings'), path: '/settings' },
  ];

  const showNav = ['/', '/home', '/main', '/order', '/profile', '/settings', ...(isAdmin ? ['/admin'] : [])].some(
    (p) => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );

  if (!showNav) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-deep-forest/10 bg-white/95 shadow-[0_-12px_30px_rgba(2,51,65,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-card/95"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 6px)',
        isolation: 'isolate',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04] dark:opacity-[0.08] pattern-batik" />

      <nav className="relative z-10 mx-auto flex h-[74px] max-w-xl items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = currentTabId === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
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
                'relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[44px] px-2 select-none',
                isActive ? 'text-[var(--color-sunshine-cta)]' : 'text-[var(--color-stone)] hover:text-deep-forest dark:hover:text-white'
              )}
            >
              <div className="relative flex h-9 w-16 items-center justify-center">
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-full border border-[var(--color-sunshine-cta)]/25 bg-[var(--color-sunshine-cta)]/12 dark:bg-[var(--color-sunshine-cta)]/18"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={cn('relative z-10 h-5 w-5 transition-transform duration-200', isActive ? 'scale-110' : 'group-hover:scale-105')} />
              </div>

              <span
                className={cn(
                  'nav-label relative z-10 transition-colors duration-200',
                  isActive
                    ? 'nav-label-active text-[var(--color-sunshine-cta)] font-semibold'
                    : 'nav-label-inactive text-deep-forest/85 dark:text-white/85'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

