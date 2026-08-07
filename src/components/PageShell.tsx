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
  actions,
  showBatik = false,
}: PageShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
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

  const handleAuth = useCallback(async () => {
    await triggerLightImpact();
    if (currentUser) {
      navigate('/profile');
    } else {
      setAuthOpen(true);
    }
  }, [currentUser, navigate]);

  const handleBack = useCallback(async () => {
    await triggerLightImpact();
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
  }, [backHref, navigate, homeRoute]);

  const variantClass =
    variant === 'centered'
      ? 'flex items-center justify-center min-h-[calc(100dvh-160px)] py-6'
      : variant === 'wizard'
      ? 'py-4'
      : 'py-6';

  return (
    <div className="page-shell">
      {/* ---- Top App Shell Header (sticky) ---- */}
      <header className="page-shell__header">
        <div className="page-shell__main flex h-14 min-h-[44px] items-center gap-2 sm:gap-3">
          {/* Back vs. Brand */}
          {!hideBack && !isHome ? (
            <button
              type="button"
              onClick={handleBack}
              className="icon-button-soft touch-target"
              aria-label={t('back') || 'Back'}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link to={homeRoute} className="flex items-center gap-2 min-h-[44px]">
              <div className="h-9 w-9 rounded-xl bg-white/80 p-0.5 ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10 flex items-center justify-center overflow-hidden">
                {/*
                  Brand asset path preserved verbatim — visual logo /
                  Malaysian heritage graphic must remain 100% intact.
                */}
                <TransparentLogo
                  src={getAssetUrl('/assets/wawasan_logo.svg')}
                  alt="Restoran Wawasan"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="hidden sm:block text-sm font-extrabold tracking-tight text-deep-forest dark:text-white">
                Restoran Wawasan
              </span>
            </Link>
          )}

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <h1
              className={cn(
                'page-header-text truncate text-base sm:text-lg font-semibold',
                'leading-tight'
              )}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="page-header-text-muted truncate text-[12px] sm:text-[13px]">
                {subtitle}
              </p>
            ) : null}
          </div>

          {/* Right-side minimal actions */}
          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={handleThemeToggle}
              className="icon-button-soft touch-target"
              aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5 text-[var(--color-sunshine-cta)]" />
              )}
            </button>
            <button
              type="button"
              onClick={handleAuth}
              className="icon-button-soft touch-target"
              aria-label={currentUser ? 'Account' : 'Sign in'}
            >
              {currentUser ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-sunshine-cta)] microcopy-12 font-black text-white">
                  {currentUser.displayName?.slice(0, 2).toUpperCase() ||
                    currentUser.email?.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ---- Eyebrow (optional) ---- */}
      {eyebrow ? (
        <div className="page-shell__main pt-4">
          <div className="microcopy-12-upper text-[var(--color-sunshine-cta)]">
            {eyebrow}
          </div>
        </div>
      ) : null}

      {/* ---- Main content area (uniform gutter) ---- */}
      <main role="main" className={cn('page-shell__main relative', variantClass)}>
        {/*
          Optional decorative Batik kept as a fixed background only —
          image asset path / file is untouched.
        */}
        {showBatik ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <Batik3DMotion
              maxRotation={4}
              imgClassName="opacity-[0.05] dark:opacity-[0.10]"
              mode="background"
            />
          </div>
        ) : null}
        {children}
      </main>

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
