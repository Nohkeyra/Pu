import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Utensils, Settings, Lock, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { triggerLightImpact } from '@/lib/haptics';
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
        className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-8px_32px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 4px)' }}
      >
        <nav className="max-w-md mx-auto flex items-center justify-around h-20 px-2">
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
                {/* MD3 Active State Pill Container */}
                <div className="relative w-16 h-8 flex items-center justify-center mb-1">
                  <Icon className={cn("w-5 h-5 z-10 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-105")} />
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-sunshine/10 dark:bg-sunshine/15 rounded-full"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
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
