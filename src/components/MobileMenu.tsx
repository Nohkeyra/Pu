import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Shield, ArrowRight, User as UserIcon, Download, Sun, Moon, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import { getAssetUrl } from '@/lib/utils';
import { triggerLightImpact } from '@/lib/haptics';
import { TransparentLogo } from './TransparentLogo';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: { label: string; href: string; isButton?: boolean }[];
  currentUser?: User | null;
  onAuthClick?: () => void;
}

export default function MobileMenu({ isOpen, onClose, links, currentUser, onAuthClick }: MobileMenuProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const toggleLanguage = async () => {
    await triggerLightImpact();
    setLanguage(language === 'en' ? 'bm' : 'en');
  };

  const handleThemeToggle = async () => {
    await triggerLightImpact();
    toggleTheme();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (overlayRef.current && itemsRef.current) {
        gsap.fromTo(
          overlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.22, ease: 'power2.out' }
        );
        gsap.fromTo(
          itemsRef.current.children,
          { x: 20, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.28, stagger: 0.03, ease: 'power2.out' }
        );
      }
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuth = async () => {
    await triggerLightImpact();
    if (onAuthClick) onAuthClick();
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={language === 'bm' ? 'Menu utama' : 'Main menu'}
      className="fixed inset-0 z-[1100] md:hidden bg-[#fdfbf7] dark:bg-[#0c100e] text-deep-forest dark:text-[#ede5d8] transition-colors duration-200"
    >
      {/* Subtle Background Pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pattern-batik" />

      <div className="relative flex h-full flex-col px-6 pb-8 pt-[calc(1.25rem+var(--sat))]">
        {/* Close Button */}
        <button
          type="button"
          onClick={async () => {
            await triggerLightImpact();
            onClose();
          }}
          className="absolute right-6 top-[calc(1rem+var(--sat))] flex h-11 w-11 items-center justify-center rounded-2xl border border-stone/15 bg-white text-deep-forest shadow-sm hover:border-[var(--color-sunshine-cta)]/40 hover:text-[var(--color-sunshine-cta)] active:scale-95 transition-all dark:border-white/10 dark:bg-[#1c2622] dark:text-[#ede5d8]"
          aria-label={language === 'bm' ? 'Tutup menu' : 'Close menu'}
        >
          <X className="h-5 w-5" />
        </button>

        <nav ref={itemsRef} className="flex flex-1 flex-col overflow-y-auto pb-6 pt-12">
          {/* Brand Header */}
          <Link 
            to={currentUser ? '/home' : '/'} 
            onClick={onClose} 
            className="mb-6 flex items-center gap-3 select-none"
          >
            <div className="h-12 w-12 rounded-2xl bg-white/80 dark:bg-[#1c2622] p-1.5 shadow-sm ring-1 ring-black/5 dark:ring-amber-500/20 flex items-center justify-center">
              <TransparentLogo
                src={getAssetUrl('/assets/wawasan_logo.svg')}
                alt="Restoran Wawasan Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="block text-xl font-bold font-display text-deep-forest dark:text-[#ede5d8] tracking-tight">
                Restoran Wawasan
              </span>
              <span className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--color-sunshine-cta)] mt-0.5">
                Pak Usop
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="space-y-1">
            {links.map((link) => {
              if (link.isButton) {
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={onClose}
                    className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-sunshine-cta)] px-6 py-3 font-bold text-[#ede5d8] shadow-md transition-all duration-300 hover:brightness-105 active:scale-[0.99]"
                  >
                    {t(link.label as Parameters<typeof t>[0])}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                );
              }

              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="flex min-h-[48px] items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-lg font-semibold text-deep-forest dark:text-[#ede5d8] transition-all duration-200 hover:border-[var(--color-sunshine-cta)]/20 hover:bg-stone-100/80 hover:text-[var(--color-sunshine-cta)] dark:hover:bg-[#1c2622] dark:hover:text-[var(--color-sunshine-cta)] active:scale-[0.99]"
                >
                  <span>{t(link.label as Parameters<typeof t>[0]) || link.label}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--color-sunshine-cta)]" />
                </a>
              );
            })}
          </div>

          {/* Bottom Action Grid */}
          <div className="mt-8 space-y-2.5">
            {/* Member Sign In / Account */}
            <button
              type="button"
              onClick={handleAuth}
              className="flex w-full min-h-[48px] items-center justify-center gap-2.5 rounded-2xl border border-stone/15 bg-white text-sm font-semibold text-deep-forest shadow-sm hover:border-[var(--color-sunshine-cta)]/40 hover:bg-stone-50 active:scale-[0.99] transition-all dark:border-white/10 dark:bg-[#1c2622] dark:text-[#ede5d8] dark:hover:bg-[#26312d]"
            >
              {currentUser ? (
                <>
                  <div className="flex min-h-[32px] min-w-[32px] h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-sunshine-cta)] text-[11px] font-black text-[#ede5d8]">
                    {(currentUser.displayName?.slice(0, 2) || currentUser.email?.slice(0, 2) || (currentUser.uid === 'admin' ? 'AD' : 'US')).toUpperCase()}
                  </div>
                  <span>{language === 'bm' ? 'Akaun / Papan Pemuka' : 'Account / Dashboard'}</span>
                </>
              ) : (
                <>
                  <UserIcon className="h-4 w-4 text-[var(--color-sunshine-cta)]" />
                  <span>{language === 'bm' ? 'Log Masuk Ahli' : 'Member Sign In'}</span>
                </>
              )}
            </button>

            {/* Language & Theme Controls Row */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-stone/15 bg-white text-sm font-semibold text-deep-forest shadow-sm hover:border-[var(--color-sunshine-cta)]/40 hover:bg-stone-50 active:scale-[0.99] transition-all dark:border-white/10 dark:bg-[#1c2622] dark:text-[#ede5d8] dark:hover:bg-[#26312d]"
              >
                <span className="tracking-wider text-xs">
                  <span className={language === 'en' ? 'text-[var(--color-sunshine-cta)] font-extrabold' : 'text-stone-400 dark:text-stone-500'}>EN</span>
                  <span className="mx-1 text-stone-300 dark:text-stone-600">/</span>
                  <span className={language === 'bm' ? 'text-[var(--color-sunshine-cta)] font-extrabold' : 'text-stone-400 dark:text-stone-500'}>BM</span>
                </span>
              </button>

              {/* Theme Switcher */}
              <button
                type="button"
                onClick={handleThemeToggle}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-stone/15 bg-white text-sm font-semibold text-deep-forest shadow-sm hover:border-[var(--color-sunshine-cta)]/40 hover:bg-stone-50 active:scale-[0.99] transition-all dark:border-white/10 dark:bg-[#1c2622] dark:text-[#ede5d8] dark:hover:bg-[#26312d]"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 text-[var(--color-sunshine-cta)]" />
                    <span className="text-xs">{language === 'bm' ? 'Cerah' : 'Light'}</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-[var(--color-sunshine-cta)]" />
                    <span className="text-xs">{language === 'bm' ? 'Gelap' : 'Dark'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Download APK */}
            <a
              href="https://github.com/Nohkeyra/Pu/releases/latest/download/app-release.apk"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-stone/15 bg-white text-sm font-semibold text-deep-forest shadow-sm hover:border-[var(--color-sunshine-cta)]/40 hover:bg-stone-50 active:scale-[0.99] transition-all dark:border-white/10 dark:bg-[#1c2622] dark:text-[#ede5d8] dark:hover:bg-[#26312d]"
            >
              <Download className="h-4 w-4 text-[var(--color-sunshine-cta)]" />
              <span>Download APK</span>
            </a>

            {/* Admin Login */}
            <Link
              to="/admin"
              onClick={onClose}
              className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-stone/15 bg-white text-sm font-medium text-stone-600 shadow-sm hover:border-[var(--color-sunshine-cta)]/40 hover:bg-stone-50 active:scale-[0.99] transition-all dark:border-white/10 dark:bg-[#1c2622] dark:text-[#ede5d8]/80 dark:hover:bg-[#26312d]"
            >
              <Shield className="h-4 w-4 text-[var(--color-sunshine-cta)]" />
              <span>{t('admin_login')}</span>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
