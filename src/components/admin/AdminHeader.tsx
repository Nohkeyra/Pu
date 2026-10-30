import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TransparentLogo } from '@/components/TransparentLogo';
import { getAssetUrl } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { triggerLightImpact } from '@/lib/haptics';
import { 
  LogOut, 
  Sun, 
  Moon, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  ArrowLeft 
} from 'lucide-react';

interface AdminHeaderProps {
  language: string;
  theme: string;
  toggleTheme: () => void;
  calendarState?: { ok: boolean; error?: string; loading: boolean };
  onLogout?: () => void | Promise<void>;
  getCalendarEnableUrl?: () => string;
  navigate?: (path: string) => void;
  t?: (key: string) => string;
  adminToken?: string;
  getApiUrl?: (path: string) => string;
}

export function AdminHeader({
  theme,
  toggleTheme,
  calendarState = { ok: false, loading: false },
  onLogout,
  getCalendarEnableUrl = () => '/api/auth/google/calendar',
  navigate,
}: AdminHeaderProps) {
  const { language, setLanguage } = useLanguage();

  const handleToggleLanguage = async () => {
    await triggerLightImpact();
    setLanguage(language === 'en' ? 'bm' : 'en');
  };

  const handleBackHome = async () => {
    await triggerLightImpact();
    if (navigate) {
      navigate('/home');
    } else {
      window.location.hash = '#/home';
    }
  };

  return (
    <>
      {/* Signature Top Accent Brand Gradient Line (Aligned with all pages) */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[1001] bg-gradient-to-r from-amber-600 via-[var(--color-sunshine-cta)] to-amber-500 pointer-events-none" />

      <header className="[grid-area:header] topbar-shell sticky top-0 z-40 transition-colors duration-200 flex flex-col pt-[calc(0.45rem+var(--sat))] pb-2 sm:pb-2.5">
        <div className="content-container flex items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Zone 1: Navigation Back + Brand Identity */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={handleBackHome}
              className="icon-button-soft touch-target h-10 w-10 rounded-xl shrink-0 text-deep-forest dark:text-stone-200 hover:text-[var(--color-sunshine-cta)] transition-colors"
              aria-label={language === 'bm' ? 'Kembali ke Laman Utama' : 'Back to Home'}
              title={language === 'bm' ? 'Kembali ke Laman Utama' : 'Back to Home'}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 sm:gap-2.5 select-none min-h-[44px]">
              <div className="h-10 w-10 rounded-xl bg-white/80 p-1 shadow-xs ring-1 ring-black/5 dark:bg-[#1c2622] dark:ring-amber-500/20 flex items-center justify-center overflow-hidden shrink-0">
                <TransparentLogo
                  src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
                  alt="Restoran Wawasan Logo"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="shrink-0 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="block font-artistic text-base sm:text-lg font-bold page-header-text leading-tight truncate">
                    Restoran Wawasan
                  </span>
                  <Badge variant="outline" className="hidden xs:inline-flex text-[10px] uppercase font-bold tracking-wider border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0 rounded-md">
                    Admin
                  </Badge>
                </div>
                <span className="block microcopy-12-upper text-[var(--color-sunshine-cta)] font-semibold leading-none mt-0.5 truncate">
                  {language === 'en' ? 'Catering Control Center' : 'Pusat Kawalan Katering'}
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Aligned Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Calendar Status */}
            <div className="hidden md:flex items-center">
              {calendarState.loading ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 text-stone text-xs rounded-xl border border-stone/15">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing Calendar...</span>
                </div>
              ) : calendarState.ok ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl border border-emerald-500/20" title="Google Calendar Sync operational">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Calendar Synced</span>
                </div>
              ) : (
                <a
                  href={getCalendarEnableUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs rounded-xl border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Enable Calendar</span>
                </a>
              )}
            </div>

            {/* Language Toggle (EN / BM) - Dedicated self-contained pill */}
            <button
              type="button"
              onClick={handleToggleLanguage}
              className="h-9 sm:h-10 min-w-[58px] px-2 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/90 dark:bg-[#1c2622]/90 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs hover:border-[var(--color-sunshine-cta)]/40 hover:text-[var(--color-sunshine-cta)] transition-all active:scale-95 shrink-0 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sunshine-cta)]"
              aria-label="Toggle Language"
              title={language === 'en' ? 'Tukar ke Bahasa Melayu' : 'Switch to English'}
            >
              <span className={language === 'en' ? 'text-[var(--color-sunshine-cta)] font-black' : 'text-stone-400 dark:text-stone-500 font-semibold'}>EN</span>
              <span className="text-stone-300 dark:text-stone-600 font-normal">/</span>
              <span className={language === 'bm' ? 'text-[var(--color-sunshine-cta)] font-black' : 'text-stone-400 dark:text-stone-500 font-semibold'}>BM</span>
            </button>

            {/* Theme Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? (language === 'en' ? 'Switch to Light Mode' : 'Tukar ke Mod Cerah') : (language === 'en' ? 'Switch to Dark Mode' : 'Tukar ke Mod Gelap')}
              className="icon-button-soft touch-target h-10 w-10 rounded-xl shrink-0"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-[var(--color-sunshine-cta)]" /> : <Moon className="w-5 h-5" />}
            </Button>

            {/* Logout Button */}
            {onLogout && (
              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="h-10 px-3 rounded-xl border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 font-semibold text-xs transition-all gap-1.5"
                title={language === 'en' ? 'Log Out' : 'Log Keluar'}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'en' ? 'Log Out' : 'Log Keluar'}</span>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
