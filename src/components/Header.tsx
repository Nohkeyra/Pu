import { useState, useEffect, useRef } from 'react';
import { Menu, User as UserIcon, Sun, Moon, Settings as SettingsIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { useHeaderScroll } from '@/hooks/useHeaderScroll';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { getAssetUrl } from '@/lib/utils';
import { triggerLightImpact } from '@/lib/haptics';
import { TransparentLogo } from './TransparentLogo';
import MobileMenu from './MobileMenu';
import AuthModal from './AuthModal';
import UserProfileDashboard from './UserProfileDashboard';
import { NotificationBell } from './NotificationBell';

const NAV_LINKS: { label: string; href: string; isButton?: boolean }[] = [
  { label: 'story', href: '#story' },
  { label: 'menu', href: '#menu' },
  { label: 'experience', href: '#experience' },
  { label: 'reviews', href: '#reviews' },
  { label: 'visit', href: '#visit' },
];

function BrandMark() {
  return (
    <div className="h-11 w-11 rounded-2xl bg-white/80 p-1 shadow-sm ring-1 ring-black/5 dark:bg-[#1c2622] dark:ring-amber-500/20 flex items-center justify-center overflow-hidden">
      <TransparentLogo
        src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
        alt="Restoran Wawasan Logo"
        className="w-full h-full object-contain"
        onError={() => {
          // Fallback to png if svg fails
        }}
      />
    </div>
  );
}

export default function Header() {
  const isScrolled = useHeaderScroll();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileDashboardOpen, setProfileDashboardOpen] = useState(false);
  const [, setTapCount] = useState(0);
  const lastTapTime = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const toggleLanguage = async () => {
    await triggerLightImpact();
    setLanguage(language === 'en' ? 'bm' : 'en');
  };

  const handleAuthClick = async () => {
    await triggerLightImpact();
    if (currentUser) {
      setProfileDashboardOpen(true);
    } else {
      setAuthModalOpen(true);
    }
  };

  const handleThemeToggle = async () => {
    await triggerLightImpact();
    toggleTheme();
  };

  const headerStateClass = isScrolled
    ? 'topbar-shell pb-2.5 sm:pb-3 pt-[calc(0.5rem+var(--sat))] sm:pt-[calc(0.7rem+var(--sat))] shadow-md'
    : 'bg-transparent pb-3 sm:pb-5 pt-[calc(0.65rem+var(--sat))] sm:pt-[calc(1.15rem+var(--sat))]';

  const brandTextClass = isScrolled 
    ? 'brand-title font-artistic' 
    : 'font-artistic text-white dark:text-[#ede5d8] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]';
  
  const brandSubClass = isScrolled 
    ? 'brand-subtitle' 
    : 'font-accent text-[12px] font-black uppercase tracking-[0.18em] text-amber-400 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]';

  const desktopActionClass = isScrolled
    ? 'icon-button-soft touch-target-row h-11 px-4 font-bold'
    : 'inline-flex h-11 items-center justify-center rounded-2xl border border-tomato-burst/50 bg-deep-forest/40 px-4 text-white font-bold shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-deep-forest/60 hover:text-[var(--color-sunshine-cta)] active:scale-[0.98] drop-shadow-[0_1px_2px_rgba(12,69,60,0.80)]';

  const mobileActionClass = isScrolled
    ? 'icon-button-soft touch-target h-11 w-11 font-bold'
    : 'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-tomato-burst/50 bg-deep-forest/40 text-white font-bold shadow-md backdrop-blur-xl transition-all duration-300 hover:bg-deep-forest/60 active:scale-[0.95] drop-shadow-[0_1px_2px_rgba(12,69,60,0.80)]';

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-[var(--color-sunshine-cta)] to-amber-500 z-[1001]" />
      <header className={`fixed left-0 right-0 top-1 z-[1000] transition-all duration-300 ${headerStateClass}`}>
        <div className="content-container flex items-center justify-between gap-4">
          <Link 
            to={currentUser ? '/home' : '/'} 
            className="flex shrink-0 items-center gap-2.5 sm:gap-3 select-none"
            onClick={(e) => {
              const now = Date.now();
              // Prevent navigation if the user is tapping rapidly (under 500ms between taps)
              if (now - lastTapTime.current < 500) {
                e.preventDefault();
              }
              lastTapTime.current = now;

              setTapCount(prev => {
                const newCount = prev + 1;
                if (newCount === 5) {
                  import('canvas-confetti').then((confetti) => {
                    confetti.default({
                      particleCount: 200,
                      spread: 120,
                      origin: { y: 0.1 },
                      colors: ['#f69913', '#0c453c', '#e03f14', '#e96212'],
                      zIndex: 9999
                    });
                  });
                  return 0;
                }
                return newCount;
              });
            }}
          >
            <BrandMark />
            <div className="shrink-0">
              <span className={`block whitespace-nowrap text-base sm:text-lg xl:text-xl font-bold ${brandTextClass}`}>
                Restoran Wawasan
              </span>
              <span className={`block microcopy-12-upper ${brandSubClass}`}>
                Pak Usop
              </span>
            </div>
          </Link>

          <nav className={`hidden items-center gap-1 xl:flex ${isScrolled ? '' : 'rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md border border-white/20 shadow-md'}`}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={
                  isScrolled
                    ? 'nav-pill'
                    : 'rounded-full px-3.5 py-1.5 microcopy-14-upper text-white transition-all duration-300 hover:bg-white/20 hover:text-[var(--color-sunshine-cta)] drop-shadow-[0_1px_2px_rgba(12,69,60,0.80)]'
                }
              >
                {t(link.label as Parameters<typeof t>[0]) || link.label.charAt(0).toUpperCase() + link.label.slice(1)}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 xl:flex shrink-0">
            <button
              type="button"
              onClick={async () => {
                await triggerLightImpact();
                navigate('/settings');
              }}
              className={desktopActionClass}
              aria-label={language === 'bm' ? 'Tetapan' : 'Settings'}
              title={language === 'bm' ? 'Tetapan' : 'Settings'}
            >
              <SettingsIcon className="h-4.5 w-4.5 text-[var(--color-sunshine-cta)]" />
            </button>

            <button
              type="button"
              onClick={handleThemeToggle}
              className={desktopActionClass}
              aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-[var(--color-sunshine-cta)]" />}
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className={`${desktopActionClass} gap-1.5 text-xs font-bold`}
              aria-label="Toggle Language"
            >
              <span className={language === 'en' ? 'text-[var(--color-sunshine-cta)]' : ''}>EN</span>
              <span className={isScrolled ? 'text-deep-forest/25 dark:text-white/25' : 'text-white/30'}>/</span>
              <span className={language === 'bm' ? 'text-[var(--color-sunshine-cta)]' : ''}>BM</span>
            </button>

            <NotificationBell
              currentUser={currentUser}
              isScrolled={isScrolled}
              onOpenProfileWithOrder={() => setProfileDashboardOpen(true)}
            />

            <button
              type="button"
              onClick={handleAuthClick}
              className={`${desktopActionClass} gap-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)]/40`}
              aria-label={currentUser ? 'Account' : 'Sign in'}
            >
              {currentUser ? (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-sunshine-cta)] text-[12px] font-black text-white shadow-sm">
                    {(currentUser.displayName?.slice(0, 2) || currentUser.email?.slice(0, 2) || (currentUser.uid === 'admin' ? 'AD' : 'US')).toUpperCase()}
                  </div>
                  <span className="hidden max-w-[120px] truncate xl:inline">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || (currentUser.uid === 'admin' ? 'Admin' : 'User')}
                  </span>
                </>
              ) : (
                <>
                  <UserIcon className="h-4.5 w-4.5 text-[var(--color-sunshine-cta)]" />
                  <span>{language === 'bm' ? 'Log Masuk' : 'Sign In'}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 xl:hidden shrink-0">
            <button
              type="button"
              onClick={async () => {
                await triggerLightImpact();
                navigate('/settings');
              }}
              className={`${mobileActionClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)]/40`}
              aria-label={language === 'bm' ? 'Tetapan' : 'Settings'}
              title={language === 'bm' ? 'Tetapan' : 'Settings'}
            >
              <SettingsIcon className="h-5 w-5 text-[var(--color-sunshine-cta)]" />
            </button>

            <button
              type="button"
              onClick={handleThemeToggle}
              className={`${mobileActionClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)]/40`}
              aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-[var(--color-sunshine-cta)]" />}
            </button>

            <NotificationBell
              currentUser={currentUser}
              isScrolled={isScrolled}
              onOpenProfileWithOrder={() => setProfileDashboardOpen(true)}
            />

            <button
              type="button"
              onClick={handleAuthClick}
              className={mobileActionClass}
              aria-label={currentUser ? 'Account' : 'Sign in'}
            >
              {currentUser ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-sunshine-cta)] text-[12px] font-black text-white">
                  {(currentUser.displayName?.slice(0, 2) || currentUser.email?.slice(0, 2) || (currentUser.uid === 'admin' ? 'AD' : 'US')).toUpperCase()}
                </div>
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={async () => {
                await triggerLightImpact();
                setMobileOpen(true);
              }}
              className={mobileActionClass}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={NAV_LINKS.map((link) => ({
          ...link,
          label: link.label.charAt(0).toUpperCase() + link.label.slice(1),
        }))}
        currentUser={currentUser}
        onAuthClick={handleAuthClick}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setProfileDashboardOpen(true)}
      />

      <UserProfileDashboard
        isOpen={profileDashboardOpen}
        onClose={() => setProfileDashboardOpen(false)}
        onReorder={(orderData) => {
          navigate('/order', { state: { reorderData: orderData } });
        }}
      />
    </>
  );
}
