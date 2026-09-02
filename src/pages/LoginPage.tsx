import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import AuthModal from '../components/AuthModal';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LogIn, Compass, ShoppingBag, Shield, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Batik3DMotion } from '../components/Batik3DMotion';
import { getAssetUrl } from '../lib/utils';

export default function LoginPage() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const { language } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const tLocal = (en: string, bm: string) => (language === 'bm' ? bm : en);

  // F-BIO-DUP (audit 2026-09-01): this used to trigger a NativeBiometric
  // fingerprint prompt right here before navigating, but its result was
  // never actually used for anything — every branch (success, failure,
  // biometrics unavailable, or a thrown error) ended in the same
  // navigate('/admin') call, and no token or session state was ever set
  // from it. The real login (password or fingerprint) happens on the Admin
  // Login screen itself via AdminPage.tsx's handleBiometricLogin, which
  // does properly store the resulting token. Keeping both meant an admin
  // had to scan their fingerprint twice in a row for one login. Removed
  // the dead biometric call here so tapping this icon just opens the Admin
  // Login screen, where the single real fingerprint scan lives.
  const handleAdminAccess = () => {
    navigate('/admin');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream px-6 py-10 dark:bg-background">
      <header className="absolute left-0 right-0 top-0 z-50 pt-[var(--sat)]">
        <div className="content-container flex h-[76px] items-center justify-between">
          <button
            onClick={toggleTheme}
            className="icon-button-soft touch-target h-11 w-11"
            aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-[var(--color-sunshine-cta)]" />}
          </button>

          <button
            onClick={handleAdminAccess}
            className="icon-button-soft touch-target h-11 w-11 text-deep-forest/50 hover:text-[var(--color-sunshine-cta)]"
            aria-label="Admin Access"
            id="admin-secret-trigger"
          >
            <Shield className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="absolute inset-0">
        <Batik3DMotion mode="background" src={getAssetUrl('/assets/heritage/batik_vector_pattern.jpg')} backgroundSize="cover" backgroundRepeat="no-repeat" imgClassName="opacity-30 contrast-[1.08] saturate-[1.12] dark:opacity-22" maxRotation={10} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(246,153,19,0.12),transparent_35%),linear-gradient(to_top,rgba(255,255,255,0.95),rgba(255,255,255,0.70),rgba(255,255,255,0.40))] dark:bg-[radial-gradient(circle_at_top,rgba(246,153,19,0.12),transparent_35%),linear-gradient(to_top,rgba(12,69,60,0.95),rgba(12,69,60,0.80),rgba(12,69,60,0.55))]" />
      </div>

      <AnimatePresence mode="wait">
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
              <div className="mb-4 h-32 w-32 flex items-center justify-center">
                <img
                  src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
                  alt="Restoran Wawasan Logo"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="mb-6 space-y-2">
                <div className="subtle-chip">Since 1986</div>
                <h1 className="font-artistic text-3xl tracking-tight text-deep-forest dark:text-white">
                  Restoran Wawasan
                </h1>
                <p className="font-accent text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-sunshine-cta)]">
                  Pak Usop
                </p>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-deep-forest/72 dark:text-white/72">
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
                  className="btn-cta flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 min-h-[52px] text-base font-semibold shadow-sunshine-glow transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99]"
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
                  className="btn-secondary flex w-full min-h-[52px] items-center justify-center gap-3 rounded-2xl px-5 py-4 text-base font-semibold"
                >
                  <ShoppingBag className="h-5 w-5 text-[var(--color-sunshine-cta)]" />
                  {tLocal('Order as Guest', 'Pesan Sebagai Tetamu')}
                </button>

                <button
                  onClick={() => {
                    sessionStorage.setItem('wawasan_session_started', 'true');
                    sessionStorage.setItem('wawasan_guest_allowed', 'true');
                    navigate('/home', { replace: true });
                  }}
                  className="btn-ghost flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm"
                >
                  <Compass className="h-4.5 w-4.5 text-[var(--color-sunshine-cta)]" />
                  {tLocal('Explore menu & story', 'Teroka menu & cerita')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
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
