import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, User as UserIcon } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { triggerLightImpact } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import AuthModal from './AuthModal';
import {
  getAssetUrl,
} from '@/lib/utils';
import { TransparentLogo } from './TransparentLogo';
import { Batik3DMotion } from './Batik3DMotion';

/* -------------------------------------------------------------------------
 * P0 — Unified Page Shell
 *
 * Standardises the screen-level chrome across Login, Landing, Order,
 * Profile, Settings and Admin:
 *   1. Identical content gutters (`page-shell__main`) on every page.
 *   2. Identical page-header height / surface / scroll behaviour.
 *   3. Back-home navigation that hides automatically on "/" + "/home".
 *      + "/main" (the semantic home routes).
 *   4. On mobile, the top header keeps theme + account only and drops
 *      any secondary/decorative icons to keep visual noise down and
 *      touch targets generous.  Back button is always prioritised when
 *      we are inside the app (not on the landing page).
 *   5. Provides an optional `subtitle`, `eyebrow` and `align` so pages
 *      don't reinvent the same accessibility-light markup.
 * ---------------------------------------------------------------------- */

type PageShellVariants = 'default' | 'centered' | 'wizard';

export interface PageShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: ReactNode;
  variant?: PageShellVariants;
  /** Path to navigate back to (defaults to "/home" when signed-in, "/"). */
  backHref?: string;
  /** Hide explicit back button (e.g. landing already shows global nav). */
  hideBack?: boolean;
  /** Optional custom back click handler. */
  onBack?: () => void;
  /** Right-side custom actions (rare). */
  actions?: ReactNode;
  /** Optional Batik overlay pattern intensity. */
  showBatik?: boolean;
}

function useCurrentUser(): User | null {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);
  return user;
}

export default function PageShell({
  children,
  title,
  subtitle,
  eyebrow,
  variant = 'default',
  backHref,
  hideBack = false,
  onBack,
  actions,
  showBatik = false,
}: PageShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUser();
  const [authOpen, setAuthOpen] = useState(false);

  // Routes that should NOT show a back button (semantic "home").
  const homeRoute = currentUser ? '/home' : '/';
  const isHome =
    location.pathname === '/' ||
    location.pathname === '/home' ||
    location.pathname === '/main';

  const handleThemeToggle = useCallback(async () => {
    await triggerLightImpact();
    toggleTheme();
  }, [toggleTheme]);

  const toggleLanguage = useCallback(async () => {
    await triggerLightImpact();
    setLanguage(language === 'en' ? 'bm' : 'en');
  }, [language, setLanguage]);

  const handleAuth = useCallback(async () => {
    await triggerLightImpact();
    if (currentUser) {
      const isAdmin = currentUser.uid === 'admin' || localStorage.getItem('wawasan_admin_token') !== null;
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } else {
      setAuthOpen(true);
    }
  }, [currentUser, navigate]);

  const handleBack = useCallback(async () => {
    await triggerLightImpact();
    if (onBack) {
      onBack();
      return;
    }
    if (backHref) {
      navigate(backHref);
      return;
    }
    // Default back semantics
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(homeRoute);
    }
  }, [onBack, backHref, navigate, homeRoute]);

  const variantClass =
    variant === 'centered'
      ? 'flex items-center justify-center min-h-[calc(100dvh-160px)] py-6'
      : variant === 'wizard'
      ? 'py-4'
      : 'py-6';

  return (
    <div className="page-shell min-h-screen relative bg-cream dark:bg-background flex flex-col">
      {/* Signature Top Accent Brand Gradient Line (Aligned with Landing Page) */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[1001] bg-gradient-to-r from-amber-600 via-[var(--color-sunshine-cta)] to-amber-500 pointer-events-none" />

      {/* ---- Top App Shell Header (sticky topbar-shell) ---- */}
      <header className="topbar-shell sticky top-0 z-40 transition-colors duration-200 pt-[calc(0.45rem+var(--sat))] pb-2 sm:pb-2.5">
        <div className="content-container flex items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Zone 1: Navigation Back + Brand Identity */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
            {!hideBack && !isHome && (
              <button
                type="button"
                onClick={handleBack}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/90 dark:bg-[#1c2622]/90 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:text-[var(--color-sunshine-cta)] hover:border-[var(--color-sunshine-cta)]/40 transition-all active:scale-95 shrink-0 shadow-2xs cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)]"
                aria-label={t('back') || 'Back'}
                title={t('back') || 'Back'}
              >
                <ArrowLeft className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </button>
            )}

            <Link
              to={homeRoute}
              className="flex min-w-0 items-center gap-2 sm:gap-2.5 select-none"
              aria-label="Restoran Wawasan Home"
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/80 p-1 shadow-xs ring-1 ring-black/5 dark:bg-[#1c2622] dark:ring-amber-500/20 flex items-center justify-center overflow-hidden shrink-0">
                <TransparentLogo
                  src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
                  alt="Restoran Wawasan Logo"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="min-w-0 flex-1">
                <span className="block font-artistic text-sm sm:text-base md:text-lg font-bold page-header-text leading-tight truncate">
                  Restoran Wawasan
                </span>
                <span className="block text-[10px] sm:text-xs font-accent font-bold uppercase tracking-wider text-[var(--color-sunshine-cta)] leading-none mt-0.5 truncate">
                  {title || subtitle || 'Pak Usop'}
                </span>
              </div>
            </Link>
          </div>

          {/* Zone 2: Consistent Right Actions (Aligned across all pages) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {actions}

            {/* Language Toggle (EN / BM) - Dedicated self-contained pill */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="h-9 sm:h-10 min-w-[58px] px-2 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/90 dark:bg-[#1c2622]/90 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs hover:border-[var(--color-sunshine-cta)]/40 hover:text-[var(--color-sunshine-cta)] transition-all active:scale-95 shrink-0 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)]"
              aria-label="Toggle Language"
              title={language === 'en' ? 'Tukar ke Bahasa Melayu' : 'Switch to English'}
            >
              <span className={language === 'en' ? 'text-[var(--color-sunshine-cta)] font-black' : 'text-stone-400 dark:text-stone-500 font-semibold'}>EN</span>
              <span className="text-stone-300 dark:text-stone-600 font-normal">/</span>
              <span className={language === 'bm' ? 'text-[var(--color-sunshine-cta)] font-black' : 'text-stone-400 dark:text-stone-500 font-semibold'}>BM</span>
            </button>

            {/* Theme Toggle (Day / Night) */}
            <button
              type="button"
              onClick={handleThemeToggle}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/90 dark:bg-[#1c2622]/90 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:text-[var(--color-sunshine-cta)] hover:border-[var(--color-sunshine-cta)]/40 transition-all active:scale-95 shrink-0 shadow-2xs cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)]"
              aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
              title={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {theme === 'light' ? (
                <Moon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              ) : (
                <Sun className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[var(--color-sunshine-cta)]" />
              )}
            </button>

            {/* Account / User Avatar */}
            <button
              type="button"
              onClick={handleAuth}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/90 dark:bg-[#1c2622]/90 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:text-[var(--color-sunshine-cta)] hover:border-[var(--color-sunshine-cta)]/40 transition-all active:scale-95 shrink-0 shadow-2xs cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)]"
              aria-label={currentUser ? 'Account' : 'Sign in'}
              title={currentUser ? 'Account' : 'Sign in'}
            >
              {currentUser ? (
                <div className="flex h-6.5 w-6.5 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-[var(--color-sunshine-cta)] text-[10px] sm:text-xs font-black text-white shadow-xs">
                  {(currentUser.displayName?.slice(0, 2) || currentUser.email?.slice(0, 2) || (currentUser.uid === 'admin' ? 'AD' : 'US')).toUpperCase()}
                </div>
              ) : (
                <UserIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-deep-forest dark:text-stone-300" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ---- Eyebrow (optional) ---- */}
      {eyebrow ? (
        <div className="content-container pt-3">
          <div className="microcopy-12-upper text-[var(--color-sunshine-cta)]">
            {eyebrow}
          </div>
        </div>
      ) : null}

      {/* ---- Main content area (uniform gutter) ---- */}
      <div className={cn('content-container relative flex-grow', variantClass)}>
        {showBatik ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <Batik3DMotion
              maxRotation={4}
              imgClassName="opacity-25 dark:opacity-20 contrast-[1.12] saturate-[1.15]"
              mode="img"
              src={getAssetUrl('/assets/heritage/batik_vector_pattern.jpg')}
            />
          </div>
        ) : null}
        {children}
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          setAuthOpen(false);
        }}
      />
    </div>
  );
}
