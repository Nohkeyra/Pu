import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getAssetUrl } from '@/lib/utils';
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
  Download,
  Smartphone
} from 'lucide-react';
import { triggerLightImpact } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';

function BrandMark() {
  return (
    <img
      src={getAssetUrl("/assets/wawasan_logo.jpg")}
      alt="Restoran Wawasan Logo"
      className="w-10 h-10 object-contain shrink-0 mix-blend-multiply"
      referrerPolicy="no-referrer"
    />
  );
}

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { 
    notificationsEnabled, 
    setNotificationsEnabled, 
    developerMode, 
    setDeveloperMode 
  } = useSettings();
  const navigate = useNavigate();

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

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cream dark:bg-background pattern-dots pb-24">
        {/* Fixed Top Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-cream/90 dark:bg-background/90 backdrop-blur-xl border-b border-border shadow-sm pt-[var(--sat)]">
          <div className="flex items-center justify-between px-6 md:px-12 h-[76px]">
            <div onClick={() => navigate('/home', { replace: true })} className="flex items-center gap-3 group cursor-pointer">
              <BrandMark />
              <div>
                <span className="font-display font-semibold text-xl text-deep-forest  leading-none tracking-tight">
                  Restoran Wawasan
                </span>
                <span className="block font-accent text-[10px] text-crisp-carrot uppercase tracking-[0.18em] leading-tight mt-0.5 font-bold">
                  Pak Usop
                </span>
              </div>
            </div>

            <Button 
              variant="ghost" 
              onClick={async () => {
                await triggerLightImpact();
                navigate(-1);
              }} 
              className="rounded-full h-10 px-4 text-stone hover:text-deep-forest dark:hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Button>
          </div>
        </header>

        {/* Main Settings Content */}
        <main className="pt-[calc(76px+var(--sat)+2rem)] px-4 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-sunshine/10 dark:bg-sunshine/20 rounded-2xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-sunshine" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-deep-forest dark:text-white">
                {t('nav_settings')}
              </h1>
              <p className="text-stone dark:text-stone/80 text-sm">
                {language === 'bm' 
                  ? 'Konfigurasikan pilihan aplikasi dan tetapan sistem anda.' 
                  : 'Configure your application preferences and system settings.'}
              </p>
            </div>
          </div>

          {/* 1. App Display (Language & Theme) */}
          <section className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-deep-forest dark:text-sunshine mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sunshine" />
              {language === 'bm' ? 'Pilihan Paparan' : 'Display Preferences'}
            </h3>

            {/* Theme Toggle Row */}
            <div className="flex items-center justify-between py-2 border-b border-border/65 last:border-0">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-deep-forest dark:text-white block">
                  {language === 'bm' ? 'Mod Gelap' : 'Dark Mode'}
                </span>
                <span className="text-xs text-stone dark:text-stone/60 leading-none">
                  {language === 'bm' 
                    ? 'Tukar tema antara paparan cerah dan gelap.' 
                    : 'Switch theme between light and dark display modes.'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-sunshine" />
                ) : (
                  <Sun className="w-4 h-4 text-sunshine" />
                )}
                <Switch 
                  checked={theme === 'dark'}
                  onCheckedChange={handleToggleTheme}
                  aria-label="Toggle dark mode"
                />
              </div>
            </div>

            {/* Language Selection Row */}
            <div className="flex flex-col gap-3 py-2 border-b border-border/65 last:border-0">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-deep-forest dark:text-white block">
                  {language === 'bm' ? 'Bahasa Aplikasi' : 'Application Language'}
                </span>
                <span className="text-xs text-stone dark:text-stone/60 leading-none">
                  {language === 'bm' 
                    ? 'Pilih bahasa pilihan anda untuk sistem.' 
                    : 'Select your preferred language for the interface.'}
                </span>
              </div>
              <div className="flex gap-2 mt-1">
                <Button
                  variant={language === 'en' ? 'default' : 'outline'}
                  onClick={() => handleLanguageChange('en')}
                  className={`flex-1 rounded-2xl h-11 font-semibold ${
                    language === 'en' 
                      ? 'bg-sunshine text-deep-forest font-extrabold hover:bg-sunshine/95' 
                      : 'border-border text-deep-forest dark:text-white hover:bg-stone/5'
                  }`}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  English
                  {language === 'en' && <Check className="w-4 h-4 ml-auto" />}
                </Button>
                <Button
                  variant={language === 'bm' ? 'default' : 'outline'}
                  onClick={() => handleLanguageChange('bm')}
                  className={`flex-1 rounded-2xl h-11 font-semibold ${
                    language === 'bm' 
                      ? 'bg-sunshine text-deep-forest font-extrabold hover:bg-sunshine/95' 
                      : 'border-border text-deep-forest dark:text-white hover:bg-stone/5'
                  }`}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Bahasa Melayu
                  {language === 'bm' && <Check className="w-4 h-4 ml-auto" />}
                </Button>
              </div>
            </div>
          </section>

          {/* 2. Notification Preferences */}
          <section className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-deep-forest dark:text-sunshine mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-sunshine" />
              {language === 'bm' ? 'Pilihan Notifikasi' : 'Notification Preferences'}
            </h3>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-deep-forest dark:text-white block">
                  {language === 'bm' ? 'Notifikasi Push Aplikasi' : 'App Push Notifications'}
                </span>
                <span className="text-xs text-stone dark:text-stone/60 leading-normal block max-w-sm">
                  {language === 'bm' 
                    ? 'Benarkan pemberitahuan untuk maklum balas tempahan, status kelulusan, dan invois rasmi.' 
                    : 'Receive notifications for order feedback, approval status updates, and official invoice generation.'}
                </span>
              </div>
              <Switch 
                checked={notificationsEnabled}
                onCheckedChange={handleToggleNotifications}
                aria-label="Toggle notifications"
              />
            </div>
          </section>

          {/* 3. Advanced Settings */}
          <section className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-deep-forest dark:text-sunshine mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sunshine" />
              {language === 'bm' ? 'Pilihan Pembangun' : 'Developer & Advanced'}
            </h3>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-deep-forest dark:text-white block">
                  {language === 'bm' ? 'Mod Pembangun' : 'Developer Mode'}
                </span>
                <span className="text-xs text-stone dark:text-stone/60 leading-normal block max-w-sm">
                  {language === 'bm' 
                    ? 'Papar data diagnosis tambahan, log status sambungan API, dan kebenaran fail.' 
                    : 'Display extra diagnostic details, connection logs, and filesystem parameters.'}
                </span>
              </div>
              <Switch 
                checked={developerMode}
                onCheckedChange={handleToggleDeveloper}
                aria-label="Toggle developer mode"
              />
            </div>
          </section>


          {/* APK Download - Visible on Web platform so users can download the native app */}
          {Capacitor.getPlatform() === 'web' && (
            <section className="bg-gradient-to-br from-crisp-carrot/10 to-sunshine/10 dark:from-crisp-carrot/15 dark:to-sunshine/15 border border-crisp-carrot/20 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs uppercase tracking-wider font-extrabold text-crisp-carrot dark:text-sunshine mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-crisp-carrot" />
                {language === 'bm' ? 'Aplikasi Android Rasmi' : 'Official Android App'}
              </h3>
              
              <div className="space-y-3">
                <p className="text-sm text-deep-forest dark:text-white leading-relaxed">
                  {language === 'bm' 
                    ? 'Dapatkan aplikasi Restoran Wawasan Pak Usop terus pada skrin utama anda! Nikmati prestasi yang lebih pantas, haptik lancar, dan notifikasi push masa nyata untuk tempahan anda.' 
                    : 'Get the Restoran Wawasan Pak Usop app right on your home screen! Enjoy faster performance, responsive native haptics, and real-time push notifications for your orders.'}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <a 
                    href="https://github.com/Nohkeyra/Pu/releases/download/7/restoran-wawasan.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async () => {
                      await triggerLightImpact();
                    }}
                    className="flex-1 rounded-2xl h-12 bg-crisp-carrot hover:bg-crisp-carrot/90 text-white font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-sm"
                  >
                    <Download className="w-5 h-5" />
                    {language === 'bm' ? 'Muat Turun APK Android' : 'Download Android APK'}
                  </a>
                </div>
                
                <p className="text-[11px] text-stone dark:text-stone/60 leading-normal">
                  {language === 'bm'
                    ? 'Arahan pemasangan: Selepas memuat turun, buka fail APK dan pilih "Pasang". Anda mungkin perlu membenarkan pemasangan daripada sumber tidak dikenali dalam tetapan penyemak imbas anda.'
                    : 'Installation guidance: After downloading, open the APK file and select "Install". You may need to allow installations from unknown sources in your browser settings.'}
                </p>
              </div>
            </section>
          )}

          {/* 4. System Information */}
          <section className="bg-white/50 dark:bg-card/50 border border-border/80 rounded-3xl p-6 shadow-sm space-y-4 text-center">
            <div className="text-xs text-stone dark:text-stone/50 space-y-1 font-mono">
              <p className="font-semibold text-deep-forest  font-sans text-sm mb-1">
                Restoran Wawasan App
              </p>
              <p>Version: 1.2.4 (Production Stable)</p>
              <p>Platform: {Capacitor.getPlatform().toUpperCase()} Runtime</p>
              <p>Backend: Render Remote Host</p>
              <p>Database: restoran-wawasan (Google Firebase)</p>
              <p className="mt-2 text-[10px] text-stone/40">
                &copy; {new Date().getFullYear()} Restoran Wawasan Pak Usop. All rights reserved.
              </p>
            </div>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}
