import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { Shield, ArrowRight, User as UserIcon } from 'lucide-react';
import type { User } from 'firebase/auth';
import { getAssetUrl } from '@/lib/utils';

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

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bm' : 'en');
  };

  useEffect(() => {
    if (!overlayRef.current || !itemsRef.current) return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      gsap.to(overlayRef.current, {
        opacity: 1,
        duration: 0.25,
        ease: 'power2.out',
        pointerEvents: 'auto',
      });
      gsap.fromTo(
        itemsRef.current.children,
        { x: 28, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.32, stagger: 0.04, ease: 'power2.out', delay: 0.04 }
      );
    } else {
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.18,
        ease: 'power2.in',
        pointerEvents: 'none',
      });
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  const handleAuth = () => {
    if (onAuthClick) onAuthClick();
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1100] opacity-0 pointer-events-none md:hidden"
      style={{ background: 'rgba(252,245,227,0.86)' }}
    >
      <div className="absolute inset-0 backdrop-blur-2xl" />

      <div className="relative flex h-full flex-col px-6 pb-8 pt-[calc(1.25rem+var(--sat))]">
        <button
          onClick={onClose}
          className="icon-button-soft absolute right-6 top-[calc(1rem+var(--sat))] h-10 w-10"
          aria-label="Close menu"
        >
          ✕
        </button>

        <nav ref={itemsRef} className="flex flex-1 flex-col overflow-y-auto pb-6 pt-12">
          <Link to={currentUser ? '/home' : '/'} onClick={onClose} className="mb-8 flex items-center gap-3">
            <img
              src={getAssetUrl('/assets/wawasan_logo.jpg')}
              alt="Restoran Wawasan Logo"
              className="h-12 w-12 rounded-2xl object-contain bg-white/80 p-1 shadow-sm ring-1 ring-black/5"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="brand-title block text-xl">Restoran Wawasan</span>
              <span className="brand-subtitle block mt-0.5">Pak Usop</span>
            </div>
          </Link>

          <div className="space-y-1">
            {links.map((link) => {
              if (link.isButton) {
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={onClose}
                    className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-sunshine px-6 py-3 font-semibold text-white shadow-sunshine-glow transition-all duration-300 hover:brightness-105"
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
                  className="flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-lg font-semibold text-deep-forest transition-all duration-300 hover:border-sunshine/15 hover:bg-white/70 hover:text-crisp-carrot"
                >
                  <span>{t(link.label as Parameters<typeof t>[0]) || link.label}</span>
                  <ArrowRight className="h-4 w-4 text-sunshine/80" />
                </a>
              );
            })}
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={handleAuth}
              className="panel-surface flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-deep-forest dark:text-white"
            >
              {currentUser ? (
                <>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-crisp-carrot text-[10px] font-black text-white">
                    {currentUser.displayName?.slice(0, 2).toUpperCase() || currentUser.email?.slice(0, 2).toUpperCase()}
                  </div>
                  <span>Account / Dashboard</span>
                </>
              ) : (
                <>
                  <UserIcon className="h-4 w-4 text-sunshine" />
                  <span>Member Sign In</span>
                </>
              )}
            </button>

            <button
              onClick={toggleLanguage}
              className="panel-surface flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-deep-forest dark:text-white"
            >
              <span className="tracking-wider">
                <span className={language === 'en' ? 'text-crisp-carrot font-extrabold' : 'text-deep-forest/45 dark:text-white/45'}>EN</span>
                <span className="mx-1.5 text-deep-forest/25 dark:text-white/25">/</span>
                <span className={language === 'bm' ? 'text-crisp-carrot font-extrabold' : 'text-deep-forest/45 dark:text-white/45'}>BM</span>
              </span>
            </button>

            <Link
              to="/admin"
              onClick={onClose}
              className="panel-surface flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-deep-forest/75 dark:text-white/75"
            >
              <Shield className="h-4 w-4 text-sunshine" />
              <span>{t('admin_login')}</span>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
