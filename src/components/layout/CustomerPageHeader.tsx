import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Moon, MoreHorizontal, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/firebaseConfig';
import { Capacitor } from '@capacitor/core';
import { getCustomerHomePath } from '@/lib/appEntryRoutes';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { TransparentLogo } from '@/components/brand/TransparentLogo';
import { getAssetUrl } from '@/lib/utils';
import { triggerLightImpact } from '@/lib/haptics';
import '../customer-pages.css';

interface CustomerPageHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  backDestination?: 'home' | 'history';
  showBack?: boolean;
  actions: { label: string; onSelect: () => void }[];
}

/**
 * Shared customer page header. Page structure and footer are owned by CustomerPageLayout.
 */
export function CustomerPageHeader({ title, subtitle, onBack, backDestination = 'history', showBack = true, actions }: CustomerPageHeaderProps) {
  const { language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [actionsOpen, setActionsOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);


  // Keep content clear when larger text or a device inset makes the header taller.
  useEffect(() => {
    const header = headerRef.current;
    const page = header?.closest<HTMLElement>('.customer-page');
    if (!header || !page) return;
    const measure = () => page.style.setProperty('--customer-header-height', `${header.getBoundingClientRect().height}px`);
    measure();
    // Older embedded browsers may not expose ResizeObserver. Keep the safe
    // initial measurement and adapt to rotation without crashing the header.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(header, { box: 'border-box' });
    return () => observer.disconnect();
  }, []);


  const bm = language === 'bm';
  const backLabel = backDestination === 'home'
    ? (bm ? 'Kembali ke halaman utama' : 'Back to home')
    : (bm ? 'Kembali' : 'Back');

  return (
    <>
      <header ref={headerRef} className="customer-page-header">
        <div className="customer-header-frame customer-brand-bar">
          <div className="customer-header-start">
            {showBack && (
              <Button
                type="button" variant="ghost" size="icon"
                className="customer-header-icon customer-back-button"
                aria-label={backLabel} title={backLabel}
                onClick={() => { void triggerLightImpact(); onBack(); }}
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
            )}
            <TransparentLogo src={getAssetUrl('/assets/brand/wawasan_logo.svg')} alt="" className="customer-brand-logo" />
          </div>
          <button
            type="button"
            onClick={() => navigate(getCustomerHomePath(Capacitor.isNativePlatform(), Boolean(auth.currentUser)), { replace: true })}
            className="customer-brand"
            aria-label={bm ? 'Restoran Wawasan — halaman utama' : 'Restoran Wawasan — home'}
          >
            <span className="customer-brand-copy">
              <span className="font-artistic customer-brand-name">Restoran Wawasan</span>
              <span className="customer-brand-caption">Pak Usop</span>
            </span>
          </button>
          <div className="customer-brand-actions">
            <Button
              type="button" variant="ghost" size="icon" className="customer-header-icon customer-theme-toggle"
              aria-label={theme === 'light' ? (bm ? 'Tukar ke tema gelap' : 'Switch to dark theme') : (bm ? 'Tukar ke tema cerah' : 'Switch to light theme')}
              onClick={() => { void triggerLightImpact(); toggleTheme(); }}
            >
              {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </Button>
            <Dialog open={actionsOpen} onOpenChange={setActionsOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="customer-header-icon customer-more" aria-label={bm ? 'Tindakan halaman' : 'Page actions'}>
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{bm ? 'Tindakan halaman' : 'Page actions'}</DialogTitle>
                  <DialogDescription>{bm ? 'Pilih tindakan untuk halaman ini.' : 'Choose an action for this page.'}</DialogDescription>
                </DialogHeader>
                <div className="space-y-1">
                  {actions.map(({ label, onSelect }) => (
                    <Button key={label} type="button" variant="ghost" className="h-auto min-h-12 w-full justify-between whitespace-normal rounded-xl px-3 py-3 text-left" onClick={() => { setActionsOpen(false); onSelect(); }}>
                      <span>{label}</span><ChevronRight className="ml-3 h-4 w-4 shrink-0" aria-hidden="true" />
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* Keep a semantic page title without a redundant visible header block. */}
        <div className="sr-only"><h1>{title}</h1><p>{subtitle}</p></div>
      </header>
    </>
  );
}
