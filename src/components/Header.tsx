import { useState, useEffect } from 'react';
import { Menu, User as UserIcon, Sun, Moon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { useHeaderScroll } from '@/hooks/useHeaderScroll';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { getAssetUrl } from '@/lib/utils';
import { triggerLightImpact } from '@/lib/haptics';
import MobileMenu from './MobileMenu';
import AuthModal from './AuthModal';
import UserProfileDashboard from './UserProfileDashboard';

const NAV_LINKS: { label: string; href: string; isButton?: boolean }[] = [
  { label: 'story', href: '#story' },
  { label: 'menu', href: '#menu' },
  { label: 'experience', href: '#experience' },
  { label: 'reviews', href: '#reviews' },
  { label: 'visit', href: '#visit' },
];

function BrandMark() {
  return (
    <img
      src={getAssetUrl('/assets/wawasan_logo.jpg')}
      alt="Restoran Wawasan Logo"
      className="h-11 w-11 rounded-2xl object-contain bg-white/80 p-1 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10"
      referrerPolicy="no-referrer"
    />
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
    ? 'topbar-shell pb-3 pt-[calc(0.7rem+var(--sat))]'
    : 'bg-transparent pb-5 pt-[calc(1.15rem+var(--sat))]';

  const desktopActionClass = isScrolled
    ? 'icon-button-soft h-11 px-4'
    : 'inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 text-white shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/16 active:scale-[0.98]';

  const mobileActionClass = isScrolled
    ? 'icon-button-soft h-10 w-10'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-sm backdrop-blur-xl transition-all duration-300 hover:bg-white/16 active:scale-[0.95]';

  return (
    <>
      <header className={`fixed left-0 right-0 top-0 z-[1000] transition-all duration-300 ${headerStateClass}`}>
        <div className="content-container flex items-center justify-between gap-4">
          <Link to={currentUser ? '/home' : '/'} className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <span className={`block truncate text-lg md:text-xl ${isScrolled ? 'brand-title' : 'font-display font-semibold tracking-tight text-white'}`}>
                Restoran Wawasan
              </span>
              <span className={`block text-[10px] font-bold uppercase tracking-[0.18em] ${isScrolled ? 'text-crisp-carrot' : 'text-sunshine/95'}`}>
                Pak Usop
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={isScrolled ? 'nav-pill' : 'rounded-full px-4 py-2 text-sm font-semibold text-white/88 transition-all duration-300 hover:bg-white/10 hover:text-white'}
              >
                {t(link.label as Parameters<typeof t>[0]) || link.label.charAt(0).toUpperCase() + link.label.slice(1)}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={handleThemeToggle}
              className={desktopActionClass}
              aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-sunshine" />}
            </button>

            <button
              onClick={toggleLanguage}
              className={`${desktopActionClass} gap-2 text-xs font-bold`}
              aria-label="Toggle Language"
            >
              <span className={language === 'en' ? 'text-sunshine' : ''}>EN</span>
              <span className={isScrolled ? 'text-deep-forest/25 dark:text-white/25' : 'text-white/30'}>/</span>
              <span className={language === 'bm' ? 'text-sunshine' : ''}>BM</span>
            </button>

            <button
              onClick={handleAuthClick}
              className={`${desktopActionClass} gap-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-sunshine/40`}
              aria-label={currentUser ? 'Account' : 'Sign in'}
            >
              {currentUser ? (
                <>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sunshine text-[10px] font-black text-white shadow-sm">
                    {currentUser.displayName?.slice(0, 2).toUpperCase() || currentUser.email?.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="hidden max-w-[140px] truncate lg:inline">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                </>
              ) : (
                <>
                  <UserIcon className="h-4.5 w-4.5 text-sunshine" />
                  <span>{language === 'bm' ? 'Log Masuk' : 'Sign In'}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={handleThemeToggle}
              className={`${mobileActionClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-sunshine/40`}
              aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-sunshine" />}
            </button>

            <button
              onClick={handleAuthClick}
              className={mobileActionClass}
              aria-label={currentUser ? 'Account' : 'Sign in'}
            >
              {currentUser ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sunshine text-[10px] font-black text-white">
                  {currentUser.displayName?.slice(0, 2).toUpperCase() || currentUser.email?.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </button>

            <button
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
