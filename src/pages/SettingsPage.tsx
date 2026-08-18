import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ResponsiveToggleRow, ResponsiveGridGroup } from '@/components/ui/ResponsiveButtonGroup';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getAssetUrl } from '@/lib/utils';
import { TransparentLogo } from '@/components/TransparentLogo';
import {
  ArrowLeft,
  Sun,
  Moon,
  Globe,
  Bell,
  Sliders,
  Cpu,
  Check,
  Settings,
  Type,
  RefreshCw,
} from 'lucide-react';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';
import { CURRENT_APP_VERSION } from '@/services/updateService';

function BrandMark() {
  return (
    <div className="h-10 w-10 flex items-center justify-center">
      {/*
        Brand asset path preserved verbatim — visual logo /
        Malaysian heritage graphic must remain 100% intact.
      */}
      <TransparentLogo
        src={getAssetUrl('/assets/wawasan_logo.svg')}
        alt="Restoran Wawasan Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    developerMode,
    setDeveloperMode,
    fontSize,
    setFontSize,
    keepAwakeEnabled,
    setKeepAwakeEnabled,
  } = useSettings();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  // Handle manual update check
  const handleCheckForUpdates = async () => {
    await triggerMediumImpact();
    setCheckingUpdates(true);

    const onResult = ({ hasUpdate, error, config }: any) => {
      setCheckingUpdates(false);
      if (error) {
        toast({
          title: language === 'bm' ? 'Ralat Semakan' : 'Check Failed',
          description: language === 'bm' 
            ? 'Gagal menyemak kemaskini terkini. Cuba lagi kemudian.' 
            : 'Could not check for updates. Try again later.',
          variant: 'error',
        });
        return;
      }

      if (hasUpdate && config) {
        toast({
          title: language === 'bm' ? 'Kemaskini Tersedia!' : 'Update Available!',
          description: language === 'bm' 
            ? `Versi baru v${config.latestVersion} sedia untuk dimuat turun.` 
            : `New version v${config.latestVersion} is available to download.`,
          variant: 'success',
        });
      } else {
        toast({
          title: language === 'bm' ? 'Aplikasi Terkini' : 'Up to Date',
          description: language === 'bm' 
            ? `Anda sedang menggunakan versi terbaru Wawasan Hub (v${CURRENT_APP_VERSION}).` 
            : `You are running the latest version of Wawasan Hub (v${CURRENT_APP_VERSION}).`,
          variant: 'success',
        });
      }
    };

    window.dispatchEvent(new CustomEvent('app:check-updates-manually', {
      detail: { onResult }
    }));
  };

  // Handle action triggers with haptics
  const handleToggleTheme = async () => {
    await triggerLightImpact();
    toggleTheme();
  };

  const handleLanguageChange = async (lang: 'en' | 'bm') => {
    await triggerLightImpact();
    setLanguage(lang);
  };

  const handleToggleNotifications = async (checked: boolean) => {
    await triggerLightImpact();
    setNotificationsEnabled(checked);
  };

  const handleToggleDeveloper = async (checked: boolean) => {
    await triggerLightImpact();
    setDeveloperMode(checked);
  };

  const handleToggleKeepAwake = async (checked: boolean) => {
    await triggerLightImpact();
    setKeepAwakeEnabled(checked);
    toast({
      title: language === 'bm' ? 'Skrin Sentiasa Aktif' : 'Keep Screen Awake',
      description: checked
        ? (language === 'bm' ? 'Skrin peranti tidak akan dimalapkan atau dikunci.' : 'Device screen will stay active and won\'t turn off.')
        : (language === 'bm' ? 'Tetapan tidur skrin biasa telah dipulihkan.' : 'Normal screen sleep settings restored.'),
      variant: 'success',
    });
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cream dark:bg-background pattern-dots pb-[calc(100px+env(safe-area-inset-bottom,16px))]">
        {/* P0 — standardised dark-mode text colour override via .glass-header */}
        <header className="glass-header fixed top-0 left-0 right-0 z-50 pt-[var(--sat)]">
          <div className="flex items-center justify-between px-4 sm:px-6 md:px-12 min-h-[60px] sm:min-h-[64px]">
            <button
              type="button"
              onClick={() => navigate('/home', { replace: true })}
              className="touch-target-row flex items-center gap-3 group text-left"
              aria-label="Go to home"
            >
              <BrandMark />
              <div>
                <span className="font-display font-semibold text-xl page-header-text leading-none tracking-tight">
                  Restoran Wawasan
                </span>
                <span className="block text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--color-sunshine-cta)] leading-tight mt-1">
                  Pak Usop
                </span>
              </div>
            </button>

            <Button
              variant="ghost"
              onClick={async () => {
                await triggerLightImpact();
                navigate(-1);
              }}
              className="touch-target-row rounded-full min-h-[44px] px-4 text-stone hover:text-deep-forest dark:hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Button>
          </div>
        </header>

        {/* Main Settings Content */}
        <main className="page-shell__main pt-[calc(76px+var(--sat)+2rem)] max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[var(--color-sunshine-cta)]/10 dark:bg-[var(--color-sunshine-cta)]/20 rounded-2xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-[var(--color-sunshine-cta)]" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-deep-forest dark:text-white">
                {t('nav_settings')}
              </h1>
              <p className="page-header-text-muted text-[14px] leading-5">
                {language === 'bm'
                  ? 'Konfigurasikan pilihan aplikasi dan tetapan sistem anda.'
                  : 'Configure your application preferences and system settings.'}
              </p>
            </div>
          </div>

          {/* 1. App Display (Language & Theme) */}
          <section className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-deep-forest dark:text-[var(--color-sunshine-cta)] mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
              {language === 'bm' ? 'Pilihan Paparan' : 'Display Preferences'}
            </h3>

            {/* Theme Toggle Row */}
            <ResponsiveToggleRow>
              <div className="space-y-0.5 pr-2">
                <span className="text-sm font-semibold text-deep-forest dark:text-white block">
                  {language === 'bm' ? 'Mod Gelap' : 'Dark Mode'}
                </span>
                <span className="text-[13px] sm:text-[14px] leading-5 text-stone dark:text-stone/75 block">
                  {language === 'bm'
                    ? 'Tukar tema antara paparan cerah dan gelap.'
                    : 'Switch theme between light and dark display modes.'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
                ) : (
                  <Sun className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
                )}
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={handleToggleTheme}
                  aria-label="Toggle dark mode"
                />
              </div>
            </ResponsiveToggleRow>

            {/* Language Selection Row */}
            <div className="flex flex-col gap-3 py-2">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-deep-forest dark:text-white block">
                  {language === 'bm' ? 'Bahasa Aplikasi' : 'Application Language'}
                </span>
                <span className="text-[13px] sm:text-[14px] leading-5 text-stone dark:text-stone/75">
                  {language === 'bm'
                    ? 'Pilih bahasa pilihan anda untuk sistem.'
                    : 'Select your preferred language for the interface.'}
                </span>
              </div>
              <ResponsiveGridGroup columns={2} className="mt-1">
                <Button
                  type="button"
                  variant={language === 'en' ? 'default' : 'outline'}
                  aria-pressed={language === 'en'}
                  onClick={() => handleLanguageChange('en')}
                  className={`w-full rounded-2xl min-h-[44px] font-semibold ${
                    language === 'en'
                      ? 'btn-cta text-white font-extrabold'
                      : 'border-border text-deep-forest dark:text-white hover:bg-stone/5'
                  }`}
                >
                  <Globe className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>English</span>
                  {language === 'en' && <Check className="w-4 h-4 ml-auto flex-shrink-0" />}
                </Button>
                <Button
                  type="button"
                  variant={language === 'bm' ? 'default' : 'outline'}
                  aria-pressed={language === 'bm'}
                  onClick={() => handleLanguageChange('bm')}
                  className={`w-full rounded-2xl min-h-[44px] font-semibold ${
                    language === 'bm'
                      ? 'btn-cta text-white font-extrabold'
                      : 'border-border text-deep-forest dark:text-white hover:bg-stone/5'
                  }`}
                >
                  <Globe className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Bahasa Melayu</span>
                  {language === 'bm' && <Check className="w-4 h-4 ml-auto flex-shrink-0" />}
                </Button>
              </ResponsiveGridGroup>
            </div>

            {/* Font Size Selection Row */}
            <div className="flex flex-col gap-3 py-2">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-deep-forest dark:text-white block flex items-center gap-2">
                  <Type className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
                  {language === 'bm' ? 'Saiz Tulisan (Selesa Mata)' : 'Text Font Size (Eye Comfort)'}
                </span>
                <span className="text-[13px] sm:text-[14px] leading-5 text-stone dark:text-stone/75">
                  {language === 'bm'
                    ? 'Laras saiz tulisan mengikut keselesaan membaca anda.'
                    : 'Adjust the text sizing for a comfortable reading experience.'}
                </span>
              </div>
              
              <ResponsiveGridGroup columns={4} className="mt-1">
                {(['sm', 'base', 'lg', 'xl'] as const).map((size) => {
                  const labelEn = size === 'sm' ? 'Small' : size === 'base' ? 'Normal' : size === 'lg' ? 'Large' : 'Huge';
                  const labelBm = size === 'sm' ? 'Kecil' : size === 'base' ? 'Biasa' : size === 'lg' ? 'Besar' : 'Sangat Besar';
                  
                  // Text preview style classes
                  const sizePreviewClass = size === 'sm' ? 'text-xs' : size === 'base' ? 'text-sm' : size === 'lg' ? 'text-base font-medium' : 'text-lg font-bold';
                  
                  return (
                    <Button
                      key={size}
                      type="button"
                      variant={fontSize === size ? 'default' : 'outline'}
                      aria-pressed={fontSize === size}
                      onClick={async () => {
                        await triggerLightImpact();
                        setFontSize(size);
                      }}
                      className={`w-full rounded-2xl min-h-[48px] p-2 flex flex-col justify-center items-center gap-0.5 transition-all duration-200 ${
                        fontSize === size
                          ? 'btn-cta text-white font-extrabold shadow-sm scale-[1.02]'
                          : 'border-border text-deep-forest dark:text-white hover:bg-stone/5'
                      }`}
                    >
                      <span className={`${sizePreviewClass} leading-tight`}>
                        {language === 'bm' ? labelBm : labelEn}
                      </span>
                      <span className="text-[10px] opacity-75 leading-none">
                        {size === 'sm' ? '14px' : size === 'base' ? '16px' : size === 'lg' ? '18px' : '20px'}
                      </span>
                    </Button>
                  );
                })}
              </ResponsiveGridGroup>
            </div>
          </section>

          {/* 2. Notification Preferences */}
          <section className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-deep-forest dark:text-[var(--color-sunshine-cta)] mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
              {language === 'bm' ? 'Pilihan Notifikasi' : 'Notification Preferences'}
            </h3>

            <ResponsiveToggleRow>
              <div className="space-y-0.5 pr-2">
                <span className="text-sm font-semibold text-deep-forest dark:text-white block">
                  {language === 'bm' ? 'Notifikasi Push Aplikasi' : 'App Push Notifications'}
                </span>
                <span className="text-[13px] sm:text-[14px] leading-5 text-stone dark:text-stone/75 block">
                  {language === 'bm'
                    ? 'Benarkan pemberitahuan untuk maklum balas tempahan, status kelulusan, dan invois rasmi.'
                    : 'Receive notifications for order feedback, approval status updates, and official invoice generation.'}
                </span>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleToggleNotifications}
                aria-label="Toggle notifications"
                className="flex-shrink-0"
              />
            </ResponsiveToggleRow>
          </section>

          {/* 3. Advanced Settings */}
          <section className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-deep-forest dark:text-[var(--color-sunshine-cta)] mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
              {language === 'bm' ? 'Tetapan Peranti & Lanjutan' : 'Device & Advanced Settings'}
            </h3>

            {/* Keep Awake Toggle */}
            <ResponsiveToggleRow>
              <div className="space-y-0.5 pr-2">
                <span className="text-sm font-semibold text-deep-forest dark:text-white block">
                  {language === 'bm' ? 'Kekalkan Skrin Aktif' : 'Keep Screen Awake'}
                </span>
                <span className="text-[13px] sm:text-[14px] leading-5 text-stone dark:text-stone/75 block">
                  {language === 'bm'
                    ? 'Pastikan skrin peranti sentiasa menyala untuk kegunaan dapur, pemandu, atau pemantauan berterusan.'
                    : 'Prevent screen from sleeping/dimming. Ideal for kitchen tablet displays, tracking riders, or continuous monitoring.'}
                </span>
              </div>
              <Switch
                checked={keepAwakeEnabled}
                onCheckedChange={handleToggleKeepAwake}
                aria-label="Toggle keep screen awake"
                className="flex-shrink-0"
              />
            </ResponsiveToggleRow>

            {/* Developer Mode */}
            <ResponsiveToggleRow>
              <div className="space-y-0.5 pr-2">
                <span className="text-sm font-semibold text-deep-forest dark:text-white block">
                  {language === 'bm' ? 'Mod Pembangun' : 'Developer Mode'}
                </span>
                <span className="text-[13px] sm:text-[14px] leading-5 text-stone dark:text-stone/75 block">
                  {language === 'bm'
                    ? 'Papar data diagnosis tambahan, log status sambungan API, dan kebenaran fail.'
                    : 'Display extra diagnostic details, connection logs, and filesystem parameters.'}
                </span>
              </div>
              <Switch
                checked={developerMode}
                onCheckedChange={handleToggleDeveloper}
                aria-label="Toggle developer mode"
                className="flex-shrink-0"
              />
            </ResponsiveToggleRow>
          </section>



          {/* 4. System Information */}
          <section className="bg-white/50 dark:bg-card/50 border border-border/80 rounded-3xl p-6 shadow-sm space-y-4 text-center">
            <div className="text-xs text-stone dark:text-stone/60 space-y-1.5 font-mono">
              <p className="font-semibold text-deep-forest dark:text-white font-sans text-sm mb-1">
                Wawasan Hub
              </p>
              <p>Version: v{CURRENT_APP_VERSION} (Production Stable)</p>
              <p>Platform: {Capacitor.getPlatform().toUpperCase()} Runtime</p>
              <p>Backend: Render Remote Host</p>
              <p>Database: restoran-wawasan (Google Firebase)</p>
              
              <div className="pt-3 max-w-[200px] mx-auto">
                <Button
                  type="button"
                  onClick={handleCheckForUpdates}
                  disabled={checkingUpdates}
                  className="w-full rounded-xl min-h-[38px] text-xs font-semibold btn-cta flex items-center justify-center gap-1.5 shadow-sm text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? 'animate-spin' : ''}`} />
                  {checkingUpdates 
                    ? (language === 'bm' ? 'Menyemak...' : 'Checking...') 
                    : (language === 'bm' ? 'Semak Kemaskini' : 'Check for Updates')}
                </Button>
              </div>

              <p className="pt-2 text-[11px] leading-4 text-stone/70 dark:text-stone/60 font-sans">
                &copy; {new Date().getFullYear()} Restoran Wawasan Pak Usop. All rights reserved.
              </p>
            </div>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}
