import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Utensils, Settings, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { triggerLightImpact } from '@/lib/haptics';
import { Batik3DMotion } from '@/components/Batik3DMotion';
import AuthModal from './AuthModal';

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const tabs = [
    { id: 'home', icon: Home, label: t('nav_home'), path: '/home' },
    { id: 'order', icon: Utensils, label: t('nav_order'), path: '/order' },
    { id: 'profile', icon: User, label: t('nav_profile'), path: '/profile' },
    { id: 'settings', icon: Settings, label: t('nav_settings'), path: '/settings' },
  ];

  const showNav = ['/home', '/main', '/order', '/profile', '/admin', '/settings'].includes(location.pathname);

  if (!showNav) return null;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-deep-forest/8 bg-white/88 shadow-[0_-12px_30px_rgba(2,51,65,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-card/92"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 6px)' }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Batik3DMotion
            maxRotation={6}
            imgClassName="opacity-[0.07] dark:opacity-[0.12]"
            mode="background"
          />
        </div>

        <nav className="relative z-10 mx-auto flex h-[74px] max-w-xl items-center justify-around px-2">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || (tab.path === '/home' && location.pathname === '/main');
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={async () => {
                  await triggerLightImpact();
                  try {
                    sessionStorage.setItem('wawasan_session_started', 'true');
                    sessionStorage.setItem('wawasan_guest_allowed', 'true');
                  } catch (storageErr) {
                    console.warn('SessionStorage unavailable:', storageErr);
                  }
                  if (tab.id === 'profile' && !currentUser) {
                    setAuthModalOpen(true);
                  } else {
                    navigate(tab.path);
                  }
                }}
                className={cn(
                  'relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[44px] px-2',
                  isActive ? 'text-[var(--color-sunshine-cta)]' : 'text-[var(--color-stone)] hover:text-deep-forest dark:hover:text-white'
                )}
              >
                <div className="relative flex h-9 w-16 items-center justify-center">
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 rounded-full border border-[var(--color-sunshine-cta)]/25 bg-[var(--color-sunshine-cta)]/12 dark:bg-[var(--color-sunshine-cta)]/18"
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    />
                  )}
                  <Icon className={cn('relative z-10 h-5 w-5 transition-transform duration-300', isActive ? 'scale-110' : 'group-hover:scale-105')} />
                </div>

                {/*
                  P1 — bottom-nav inactive label brightness was opacity-70
                  (poor scan on small mobile viewports); now 90 %
                  ("nav-label-inactive") for inactive state, full opacity
                  for active.  Class comes from .nav-label-* in index.css.
                */}
                <span className={cn(
                  'nav-label',
                  isActive ? 'nav-label-active text-[var(--color-sunshine-cta)]' :
                            'nav-label-inactive text-deep-forest/85 dark:text-white/85'
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          navigate('/profile');
        }}
      />
    </>
  );
}
