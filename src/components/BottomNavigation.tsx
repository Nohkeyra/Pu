import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Utensils, Settings, Lock, User } from 'lucide-react';
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
    { id: 'settings', icon: Settings, label: t('nav_settings'), path: '/settings' },
    { id: 'admin', icon: Lock, label: t('nav_admin'), path: '/admin' },
    { id: 'profile', icon: User, label: t('nav_profile'), path: '/profile' },
  ];

  // Only show bottom nav on these routes
  const showNav = ['/home', '/main', '/order', '/profile', '/admin', '/settings'].includes(location.pathname);

  if (!showNav) return null;

  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-card/95 backdrop-blur-xl border-t border-sunshine/20 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] overflow-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 4px)' }}
      >
        {/* Whole Navigation Bar Batik Background Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Batik3DMotion
            maxRotation={8}
            imgClassName="opacity-[0.15] dark:opacity-[0.22]"
            mode="background"
          />
        </div>

        <nav className="relative z-10 max-w-md mx-auto flex items-center justify-around h-20 px-2">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || (tab.path === '/home' && location.pathname === '/main');
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={async () => {
                  await triggerLightImpact();
                  if (tab.id === 'profile' && !currentUser) {
                    setAuthModalOpen(true);
                  } else {
                    navigate(tab.path);
                  }
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center w-full h-full transition-colors duration-300 group focus:outline-none",
                  isActive ? "text-sunshine dark:text-sunshine" : "text-stone hover:text-deep-forest dark:hover:text-white"
                )}
              >
                {/* MD3 Active State Pill Container (Clean solid active highlight without batik inside) */}
                <div className="relative w-16 h-8 flex items-center justify-center mb-1">
                  <Icon className={cn("w-5 h-5 z-10 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-105")} />
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-sunshine/20 dark:bg-sunshine/25 rounded-full border border-sunshine/40"
                      animate={{
                        boxShadow: [
                          '0 0 2px rgba(251, 191, 36, 0.15)',
                          '0 0 10px rgba(251, 191, 36, 0.55)',
                          '0 0 2px rgba(251, 191, 36, 0.15)'
                        ],
                        borderColor: [
                          'rgba(251, 191, 36, 0.4)',
                          'rgba(251, 191, 36, 0.85)',
                          'rgba(251, 191, 36, 0.4)'
                        ]
                      }}
                      // @ts-expect-error Framer Motion transitions are not fully typed for custom properties
                      transition={{
                        boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                        borderColor: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                        default: { type: 'spring', bounce: 0.15, duration: 0.5 }
                      }}
                    />
                  )}
                </div>
                
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                  isActive ? "opacity-100 scale-105 font-extrabold" : "opacity-65"
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
