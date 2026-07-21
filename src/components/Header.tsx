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
      src={getAssetUrl("/assets/wawasan_logo.jpg")}
      alt="Restoran Wawasan Logo"
      className="w-12 h-12 object-contain shrink-0 mix-blend-multiply"
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

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-500 ${
          isScrolled 
            ? 'glass-header pb-3 pt-[calc(0.75rem+var(--sat))]' 
            : 'bg-transparent pb-6 pt-[calc(1.5rem+var(--sat))]'
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between gap-4 md:gap-6 lg:gap-8">
          <Link to={currentUser ? "/home" : "/"} className="flex items-center gap-3 group shrink-0">
            <BrandMark />
            <div className="shrink-0 flex flex-col justify-center">
              <span className={`font-urban text-lg md:text-xl leading-none tracking-wide transition-colors duration-300 ${
                isScrolled ? 'text-deep-forest' : 'text-white'
              }`}>
                Restoran Wawasan
              </span>
              <span className="block font-graffiti text-sm md:text-base text-crisp-carrot leading-none -mt-1 ml-0.5">
                Pak Usop
              </span>
            </div>
          </Link>
 
          <nav className="hidden md:flex items-center gap-4 lg:gap-8 shrink-0">
            {NAV_LINKS.map((link) => {
              if (link.isButton) {
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sunshine to-crisp-carrot text-white rounded-full font-bold text-xs hover:shadow-xl transition-all duration-300 hover:shadow-sunshine-glow hover:-translate-y-0.5"
                  >
                    {t(link.label as Parameters<typeof t>[0])}
                  </Link>
                );
              }
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold transition-colors duration-300 ${
                    isScrolled 
                      ? 'text-deep-forest/80 hover:text-sunshine' 
                      : 'text-white/90 hover:text-sunshine'
                  }`}
                >
                  {t(link.label as Parameters<typeof t>[0]) || link.label.charAt(0).toUpperCase() + link.label.slice(1)}
                </a>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={handleThemeToggle}
              className={`p-2.5 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                isScrolled
                  ? 'text-deep-forest/70 hover:text-deep-forest bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/5 dark:hover:bg-white/10'
                  : 'text-white/80 hover:text-white bg-white/[0.08] hover:bg-white/[0.15]'
              }`}
              aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {theme === 'light' ? (
                <Moon className={`w-5 h-5 animate-float transition-colors duration-300 ${isScrolled ? 'text-deep-forest' : 'text-white'}`} />
              ) : (
                <Sun className="w-5 h-5 text-sunshine animate-pulse" />
              )}
            </button>

            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center px-4 py-2 rounded-xl transition-all duration-300 text-xs font-bold hover:shadow-sm ${
                isScrolled
                  ? 'border border-deep-forest/10 hover:border-sunshine/30 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/5 text-deep-forest/80'
                  : 'border border-white/15 hover:border-white/30 bg-white/[0.05] hover:bg-white/[0.1] text-white'
              }`}
              aria-label="Toggle Language"
            >
              <span className="tracking-widest">
                <span className={language === 'en' ? 'text-sunshine font-extrabold' : (isScrolled ? 'text-deep-forest/50' : 'text-white/50')}>EN</span>
                <span className={`${isScrolled ? 'text-deep-forest/20' : 'text-white/20'} mx-1`}>|</span>
                <span className={language === 'bm' ? 'text-sunshine font-extrabold' : (isScrolled ? 'text-deep-forest/50' : 'text-white/50')}>BM</span>
              </span>
            </button>

            {/* Client login / account */}
            <button
              onClick={handleAuthClick}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all duration-300 text-xs font-bold hover:shadow-md ${
                isScrolled
                  ? 'border border-deep-forest/10 hover:border-sunshine/40 text-deep-forest/80 hover:text-deep-forest hover:bg-white dark:hover:bg-white/5'
                  : 'border border-white/15 hover:border-white/40 text-white/90 hover:text-white hover:bg-white/[0.1]'
              }`}
              aria-label={currentUser ? 'Account' : 'Sign in'}
            >
              {currentUser ? (
                <>
                  <div className="w-6 h-6 rounded-lg bg-sunshine text-white flex items-center justify-center font-black text-[10px] shadow-sm">
                    {currentUser.displayName?.slice(0, 2).toUpperCase() || currentUser.email?.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`hidden lg:inline font-urban tracking-tight transition-colors duration-300 ${isScrolled ? 'text-deep-forest/80' : 'text-white/90'}`}>
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                </>
              ) : (
                <>
                  <UserIcon className="w-4 h-4 text-sunshine" />
                  <span className={`font-urban uppercase tracking-wider transition-colors duration-300 ${isScrolled ? 'text-deep-forest/80' : 'text-white/90'}`}>{language === 'bm' ? 'Log Masuk' : 'Sign In'}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex md:hidden items-center gap-2">
            {/* Mobile Theme Toggle */}
            <button
              onClick={handleThemeToggle}
              className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center active:scale-90 ${
                isScrolled
                  ? 'bg-black/[0.03] dark:bg-white/[0.05] text-deep-forest'
                  : 'bg-white/[0.08] text-white hover:bg-white/[0.15]'
              }`}
              aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {theme === 'light' ? (
                <Moon className={`w-5 h-5 transition-colors duration-300 ${isScrolled ? 'text-deep-forest' : 'text-white'}`} />
              ) : (
                <Sun className="w-5 h-5 text-sunshine" />
              )}
            </button>

            {/* Mobile User Account / Sign In */}
            <button
              onClick={handleAuthClick}
              className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center active:scale-90 ${
                isScrolled
                  ? 'bg-black/[0.03] dark:bg-white/[0.05] text-deep-forest'
                  : 'bg-white/[0.08] text-white hover:bg-white/[0.15]'
              }`}
              aria-label={currentUser ? 'Account' : 'Sign in'}
            >
              {currentUser ? (
                <div className="w-6.5 h-6.5 rounded-lg bg-sunshine text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.displayName?.slice(0, 2).toUpperCase() || currentUser.email?.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <UserIcon className={`w-5 h-5 transition-colors duration-300 ${isScrolled ? 'text-deep-forest/60' : 'text-white/80'}`} />
              )}
            </button>

            <button
              onClick={async () => {
                await triggerLightImpact();
                setMobileOpen(true);
              }}
              className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center active:scale-90 ${
                isScrolled
                  ? 'bg-black/[0.03] dark:bg-white/[0.05] text-deep-forest'
                  : 'bg-white/[0.08] text-white hover:bg-white/[0.15]'
              }`}
            >
              <Menu className={`w-6 h-6 transition-colors duration-300 ${isScrolled ? 'text-deep-forest' : 'text-white'}`} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={NAV_LINKS.map((link) => ({ 
          ...link, 
          label: link.label.charAt(0).toUpperCase() + link.label.slice(1) 
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
