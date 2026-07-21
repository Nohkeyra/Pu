import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/firebaseConfig';
import AuthModal from '@/components/AuthModal';
import CinematicLogo from '@/components/CinematicLogo';
import { getAssetUrl } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { LogIn, Compass, ShoppingBag, Shield, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  
  const tLocal = (en: string, bm: string) => (language === 'bm' ? bm : en);

  useEffect(() => {
    // Keep splash animation visible for 2 seconds for a premium native feel
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-cream overflow-hidden">
      {/* Top Header Wrapper for Equal Alignment across all pages */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-transparent pt-[var(--sat)]">
        <div className="flex items-center justify-between px-6 md:px-12 h-[76px]">
          {/* Top Left Theme Toggle */}
          <button 
            onClick={toggleTheme} 
            className="w-11 h-11 bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center hover:bg-white/60 dark:hover:bg-black/40 transition-all duration-300 text-deep-forest hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-deep-forest animate-float" />
            ) : (
              <Sun className="w-5 h-5 text-sunshine animate-pulse" />
            )}
          </button>

          {/* Top Right Admin Access */}
          <button
            onClick={() => navigate('/admin')}
            className="w-11 h-11 bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center hover:bg-white/60 dark:hover:bg-black/40 transition-all duration-300 text-deep-forest/20 hover:text-deep-forest hover:scale-105 active:scale-95 cursor-pointer shadow-sm group"
            aria-label="Admin Access"
            id="admin-secret-trigger"
          >
            <Shield className="w-5 h-5 transition-colors group-hover:text-sunshine" />
          </button>
        </div>
      </header>

      {/* Background Image with elegant Ken Burns scale animation */}
      <div className="absolute inset-0">
        <motion.img 
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.22 }}
          transition={{ duration: 2.5, ease: 'easeOut' }}
          src={getAssetUrl('/assets/batik_pattern.jpg')}
          alt="Batik Background"
          className="w-full h-full object-cover opacity-30 dark:opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/80 to-transparent" />
      </div>

      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="relative z-10 flex flex-col items-center justify-center px-6 text-center"
          >
            <CinematicLogo sizeClassName="w-56 h-56" />

            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="font-display font-black text-deep-forest mt-6 tracking-tight flex flex-col items-center"
            >
              <span className="font-graffiti text-2xl text-crisp-carrot leading-none mt-1 rotate-[-1.5deg]">
                Pak Usop
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.35, 0.8, 0.35] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut", delay: 0.8 }}
              className="mt-8 text-sunshine font-accent text-xs uppercase tracking-[0.3em] font-semibold"
            >
              {tLocal('Loading authentic flavors...', 'Memuatkan cita rasa asli...')}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="login-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md px-6 flex flex-col items-center"
          >
            <CinematicLogo sizeClassName="w-56 h-56 mb-4" />
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="font-display font-black text-deep-forest text-center mb-1 tracking-tight flex flex-col items-center"
            >
              <span className="font-graffiti text-2xl sm:text-3xl text-crisp-carrot leading-none mt-1 rotate-[-1.5deg]">
                Pak Usop
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-sunshine font-accent text-xs sm:text-sm uppercase tracking-[0.25em] font-bold mb-8"
            >
              Catering Services
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-full space-y-3.5 font-display"
            >
              <button 
                onClick={() => {
                  if (auth.currentUser) {
                    sessionStorage.setItem('wawasan_session_started', 'true');
                    navigate('/home');
                  } else {
                    setAuthOpen(true);
                  }
                }}
                className="w-full py-4.5 bg-sunshine text-white rounded-2xl font-black text-lg shadow-sunshine-glow hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer duration-500 hover:scale-[1.02] hover:shadow-xl"
              >
                <LogIn className="w-5 h-5" />
                {tLocal('Sign In / Register', 'Log Masuk / Daftar')}
              </button>

              <button 
                onClick={() => {
                  sessionStorage.setItem('wawasan_session_started', 'true');
                  sessionStorage.setItem('wawasan_guest_allowed', 'true');
                  navigate('/order');
                }}
                className="w-full py-4.5 bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-sunshine/10 rounded-2xl text-deep-forest font-bold text-lg hover:bg-white dark:hover:bg-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer duration-500 hover:scale-[1.02] hover:shadow-premium hover:border-sunshine/30 shadow-sm"
              >
                <ShoppingBag className="w-5 h-5 text-sunshine" />
                {tLocal('Order Now (Guest)', 'Pesan Sekarang (Pelawat)')}
              </button>
              
              <button 
                onClick={() => {
                  sessionStorage.setItem('wawasan_session_started', 'true');
                  sessionStorage.setItem('wawasan_guest_allowed', 'true');
                  navigate('/home', { replace: true });
                }}
                className="w-full py-4 bg-transparent rounded-2xl text-deep-forest/40 font-bold text-base hover:text-deep-forest hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer duration-300"
              >
                <Compass className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                {tLocal('Explore Menu & Story', 'Teroka Menu & Cerita')}
              </button>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={authOpen} 
        onClose={() => setAuthOpen(false)} 
        onSuccess={() => {
          sessionStorage.setItem('wawasan_session_started', 'true');
          navigate('/home', { replace: true });
        }}
      />
    </div>
  );
}
