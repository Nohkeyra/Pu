import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/firebaseConfig';
import AuthModal from '@/components/AuthModal';
import CinematicLogo from '@/components/CinematicLogo';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { LogIn, Compass, ShoppingBag, Shield, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Batik3DMotion } from '@/components/Batik3DMotion';

export default function LoginPage() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { language } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const tLocal = (en: string, bm: string) => (language === 'bm' ? bm : en);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream px-6 py-10 dark:bg-background">
      <header className="absolute left-0 right-0 top-0 z-50 pt-[var(--sat)]">
        <div className="content-container flex h-[76px] items-center justify-between">
          <button
            onClick={toggleTheme}
            className="icon-button-soft h-11 w-11"
            aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-sunshine" />}
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="icon-button-soft h-11 w-11 text-deep-forest/50 hover:text-sunshine"
            aria-label="Admin Access"
            id="admin-secret-trigger"
          >
            <Shield className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="absolute inset-0">
        <Batik3DMotion mode="img" imgClassName="opacity-24 dark:opacity-16" maxRotation={12} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(253,94,2,0.12),transparent_35%),linear-gradient(to_top,rgba(252,245,227,0.96),rgba(252,245,227,0.72),rgba(252,245,227,0.4))] dark:bg-[radial-gradient(circle_at_top,rgba(253,94,2,0.12),transparent_35%),linear-gradient(to_top,rgba(18,18,20,0.96),rgba(18,18,20,0.76),rgba(18,18,20,0.48))]" />
      </div>

      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="relative z-10 flex flex-col items-center justify-center text-center"
          >
            <CinematicLogo sizeClassName="h-52 w-52" />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45 }}
              className="mt-6"
            >
              <h1 className="font-display text-3xl font-bold tracking-tight text-deep-forest dark:text-white">
                Restoran Wawasan
              </h1>
              <p className="mt-1 font-accent text-xs font-bold uppercase tracking-[0.28em] text-crisp-carrot">
                Pak Usop
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.82, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut', delay: 0.65 }}
              className="mt-6 text-xs font-semibold uppercase tracking-[0.26em] text-sunshine"
            >
              {tLocal('Loading authentic flavors', 'Memuatkan cita rasa asli')}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="login-content"
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md"
          >
            <div className="panel-surface overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
              <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center text-center">
                <CinematicLogo sizeClassName="mb-3 h-40 w-40 sm:h-44 sm:w-44" />

                <div className="mb-6 space-y-2">
                  <div className="subtle-chip">Since 1986</div>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-deep-forest dark:text-white">
                    Restoran Wawasan
                  </h1>
                  <p className="font-accent text-sm font-bold uppercase tracking-[0.24em] text-crisp-carrot">
                    Pak Usop
                  </p>
                  <p className="mx-auto max-w-sm text-sm leading-relaxed text-deep-forest/68 dark:text-white/72">
                    {tLocal(
                      'Catering, signature dishes, and a smoother ordering flow in one place.',
                      'Katering, hidangan istimewa, dan aliran tempahan yang lebih kemas dalam satu aplikasi.'
                    )}
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <button
                    onClick={() => {
                      if (auth.currentUser) {
                        sessionStorage.setItem('wawasan_session_started', 'true');
                        navigate('/home');
                      } else {
                        setAuthOpen(true);
                      }
                    }}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-sunshine px-5 py-4 text-base font-semibold text-white shadow-sunshine-glow transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.99]"
                  >
                    <LogIn className="h-5 w-5" />
                    {tLocal('Sign In / Register', 'Log Masuk / Daftar')}
                  </button>

                  <button
                    onClick={() => {
                      sessionStorage.setItem('wawasan_session_started', 'true');
                      sessionStorage.setItem('wawasan_guest_allowed', 'true');
                      navigate('/order');
                    }}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-deep-forest/10 bg-white/80 px-5 py-4 text-base font-semibold text-deep-forest shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sunshine/25 hover:bg-white active:scale-[0.99] dark:border-white/10 dark:bg-white/6 dark:text-white dark:hover:bg-white/10"
                  >
                    <ShoppingBag className="h-5 w-5 text-sunshine" />
                    {tLocal('Order as Guest', 'Pesan Sebagai Tetamu')}
                  </button>

                  <button
                    onClick={() => {
                      sessionStorage.setItem('wawasan_session_started', 'true');
                      sessionStorage.setItem('wawasan_guest_allowed', 'true');
                      navigate('/home', { replace: true });
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-deep-forest/70 transition-all duration-300 hover:bg-deep-forest/[0.04] hover:text-deep-forest active:scale-[0.99] dark:text-white/70 dark:hover:bg-white/6 dark:hover:text-white"
                  >
                    <Compass className="h-4.5 w-4.5 text-sunshine" />
                    {tLocal('Explore menu & story', 'Teroka menu & cerita')}
                  </button>
                </div>
              </div>
            </div>
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
