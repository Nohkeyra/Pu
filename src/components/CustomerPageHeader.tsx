import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Moon, MoreHorizontal, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { TransparentLogo } from '@/components/TransparentLogo';
import { getAssetUrl } from '@/lib/utils';
import { triggerLightImpact } from '@/lib/haptics';
import './customer-pages.css';

interface CustomerPageHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  actions: { label: string; onSelect: () => void }[];
}

/** Shared page chrome. Brand artwork and its Uncial Antiqua wordmark are protected. */
export function CustomerPageHeader({ title, subtitle, onBack, actions }: CustomerPageHeaderProps) {
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
    const observer = new ResizeObserver(measure);
    observer.observe(header, { box: 'border-box' });
    return () => observer.disconnect();
  }, []);

  const bm = language === 'bm';

  return (
    <header ref={headerRef} className="customer-page-header">
      <div className="customer-header-frame customer-brand-bar">
        <button
          type="button"
          onClick={() => navigate('/home', { replace: true })}
          className="customer-brand"
          aria-label={bm ? 'Restoran Wawasan — halaman utama' : 'Restoran Wawasan — home'}
        >
          <TransparentLogo src={getAssetUrl('/assets/brand/wawasan_logo.svg')} alt="" className="customer-brand-logo" />
          <span className="customer-brand-copy">
            <span className="font-artistic customer-brand-name">Restoran Wawasan</span>
            <span className="customer-brand-caption">Pak Usop</span>
          </span>
        </button>
        <Button
          type="button" variant="ghost" size="icon" className="customer-header-icon customer-theme-toggle"
          aria-label={theme === 'light' ? (bm ? 'Tukar ke tema gelap' : 'Switch to dark theme') : (bm ? 'Tukar ke tema cerah' : 'Switch to light theme')}
          onClick={() => { void triggerLightImpact(); toggleTheme(); }}
        >
          {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
        </Button>
      </div>
      <div className="customer-header-frame customer-page-bar">
        <Button type="button" variant="ghost" size="icon" className="customer-header-icon customer-back" aria-label={bm ? 'Kembali' : 'Back'} onClick={() => { void triggerLightImpact(); onBack(); }}>
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div className="customer-page-title">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
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
    </header>
  );
}
