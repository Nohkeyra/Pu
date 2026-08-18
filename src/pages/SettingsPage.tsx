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
  Palette,
  Shield,
  RotateCcw,
  Paintbrush,
  LayoutGrid,
  Radio,
  Terminal,
} from 'lucide-react';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';
import { CURRENT_APP_VERSION, type AppVersionConfig } from '@/services/updateService';
import { AdminDiagnosticsTab } from '@/components/admin/AdminDiagnosticsTab';
import { AdminUpdatesTab } from '@/components/admin/AdminUpdatesTab';
import InAppUpdateModal from '@/components/InAppUpdateModal';
import { generateInvoicePDF } from '@/services/pdfService';
import { getApiUrl } from '@/lib/api';

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
    isAdmin,
    customMainColor,
    setCustomMainColor,
    customFontSizePx,
    setCustomFontSizePx,
    customCardSizeScale,
    setCustomCardSizeScale,
    resetUiToDefault,
  } = useSettings();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  // Admin sub-menu active tab state ('appearance' | 'updates' | 'diagnostics')
  const [adminSubTab, setAdminSubTab] = useState<'appearance' | 'updates' | 'diagnostics'>('appearance');
  const [previewUpdateConfig, setPreviewUpdateConfig] = useState<AppVersionConfig | null>(null);

  // Diagnostics states
  const [diagFirebase, setDiagFirebase] = useState<{ status: 'idle' | 'running' | 'pass' | 'fail'; message?: string; projectId?: string }>({ status: 'idle' });
  const [diagCalendar, setDiagCalendar] = useState<{ status: 'idle' | 'running' | 'pass' | 'fail'; message?: string; calendarsReturned?: number }>({ status: 'idle' });
  const [diagEmail, setDiagEmail] = useState<{ status: 'idle' | 'running' | 'pass' | 'fail'; message?: string }>({ status: 'idle' });
  const [diagPdf, setDiagPdf] = useState<{ status: 'idle' | 'running' | 'pass' | 'fail'; message?: string }>({ status: 'idle' });
  const [diagNative, setDiagNative] = useState<{
    status: 'idle' | 'running' | 'pass' | 'fail';
    details?: {
      isNative: boolean;
      platform: string;
      hasFilesystem: boolean;
      hasShare: boolean;
      userAgent?: string;
      deviceInfo?: Record<string, unknown>;
      deviceId?: Record<string, unknown>;
      batteryInfo?: Record<string, unknown>;
      error?: string;
    };
  }>({ status: 'idle' });

  const [diagTests, setDiagTests] = useState<{ id: string; status: 'idle' | 'running' | 'pass' | 'fail'; name: string }[]>([
    { id: 'combined_invoice', name: 'Combined Invoice Service (Multi-Order)', status: 'idle' },
    { id: 'consolidated_invoice', name: 'Consolidated Invoice Service (Multi-Client)', status: 'idle' },
    { id: 'db_latency', name: 'Cloud Firestore Latency (Live Ping)', status: 'idle' },
    { id: 'auth_session', name: 'Admin Session Integrity', status: 'idle' }
  ]);

  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const [erudaEnabled, setErudaEnabled] = useState(
    () => localStorage.getItem('wawasan_eruda_enabled') === 'true'
  );

  const adminToken = typeof localStorage !== 'undefined' ? localStorage.getItem('wawasan_admin_token') || '' : '';

  const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  });

  const toggleEruda = async () => {
    const nextState = !erudaEnabled;
    setErudaEnabled(nextState);
    localStorage.setItem('wawasan_eruda_enabled', nextState ? 'true' : 'false');
    
    const erudaWin = window as unknown as { eruda?: { destroy: () => void } };
    
    if (nextState) {
      toast({
        title: "Developer Toolkit Enabled",
        description: "Loading inspector console... Look for gear icon in bottom-right corner.",
      });
      try {
        const fetchDesc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
        const isFetchWritable = !fetchDesc || fetchDesc.writable || Boolean(fetchDesc.set);

        if (!isFetchWritable) {
          toast({
            title: "Toolkit Unavailable in Preview iFrame",
            description: "Browser protects window.fetch. Open in new window to inspect.",
            variant: "error"
          });
          return;
        }

        const erudaModule = await import('eruda');
        if (!document.getElementById('eruda') && !erudaWin.eruda) {
          erudaModule.default.init();
        }
      } catch (err) {
        console.error('Failed to load Eruda dynamically:', err);
        toast({
          title: "Toolkit Load Failed",
          description: "Could not load eruda module.",
          variant: "error"
        });
      }
    } else {
      toast({
        title: "Developer Toolkit Disabled",
        description: "The inspector console has been deactivated.",
      });
      if (erudaWin.eruda) {
        try {
          erudaWin.eruda.destroy();
          erudaWin.eruda = undefined;
        } catch (e) {
          console.warn('Eruda destroy error:', e);
        }
      }
    }
  };

  const runFirebaseDiag = async () => {
    setDiagFirebase({ status: 'running' });
    try {
      const response = await fetch(getApiUrl('/api/diagnostics/firebase'), { headers: authHeaders() });
      const data = await response.json();
      if (response.ok) {
        setDiagFirebase({ 
          status: 'pass', 
          projectId: data.projectId,
          message: data.message || `Connected from ${Capacitor.isNativePlatform() ? 'Android APK' : 'Web Browser'}` 
        });
      } else {
        setDiagFirebase({ 
          status: 'fail', 
          message: data.message || data.error || 'Failed to authenticate/write to Firestore' 
        });
      }
    } catch (err: unknown) {
      setDiagFirebase({ status: 'fail', message: err instanceof Error ? err.message : 'Network connection failed' });
    }
  };

  const runCalendarDiag = async () => {
    setDiagCalendar({ status: 'running' });
    try {
      const response = await fetch(getApiUrl('/api/diagnostics/calendar'), { headers: authHeaders() });
      const data = await response.json();
      if (response.ok && data.status === 'healthy') {
        setDiagCalendar({ 
          status: 'pass', 
          calendarsReturned: data.calendarsReturned,
          message: data.message 
        });
      } else {
        setDiagCalendar({ 
          status: 'fail', 
          message: data.message || data.error || `Status: ${data.status || response.status}` 
        });
      }
    } catch (err: unknown) {
      setDiagCalendar({ status: 'fail', message: err instanceof Error ? err.message : 'Network connection failed' });
    }
  };

  const runNativeDiag = async () => {
    setDiagNative({ status: 'running' });
    try {
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      const hasFilesystem = typeof Filesystem !== 'undefined';
      const hasShare = typeof Share !== 'undefined';

      let deviceInfo: Record<string, unknown> | undefined;
      let deviceId: Record<string, unknown> | undefined;
      let batteryInfo: Record<string, unknown> | undefined;

      try {
        deviceInfo = (await Device.getInfo()) as unknown as Record<string, unknown>;
        deviceId = (await Device.getId()) as unknown as Record<string, unknown>;
      } catch (e) {
        console.warn('Device info not available:', e);
      }

      try {
        batteryInfo = (await Device.getBatteryInfo()) as unknown as Record<string, unknown>;
      } catch (e) {
        console.warn('Battery info not available:', e);
      }

      setDiagNative({
        status: 'pass',
        details: {
          isNative,
          platform,
          hasFilesystem,
          hasShare,
          userAgent: navigator.userAgent,
          deviceInfo,
          deviceId,
          batteryInfo,
        }
      });
    } catch (err: unknown) {
      setDiagNative({
        status: 'fail',
        details: {
          isNative: false,
          platform: 'unknown',
          hasFilesystem: false,
          hasShare: false,
          error: err instanceof Error ? err.message : String(err),
        }
      });
    }
  };

  const runPdfDiag = async () => {
    setDiagPdf({ status: 'running' });
    try {
      const pdfData = {
        id: 'diag_' + Math.random().toString(36).substring(2, 8),
        to: 'Pejabat Pentadbiran Diagnostik',
        attn: 'Bahagian Teknologi Maklumat',
        name: 'Sistem Diagnostik Wawasan',
        contact: '03-88880000',
        email: 'diagnostic-test@wawasan.com',
        dateTime: new Date().toISOString(),
        location: 'Blok B, Kompleks Kerajaan, Putrajaya',
        quantity: 50,
        meals: ['breakfast', 'lunch'],
        menu: 'Nasi Lemak Ayam Goreng, Teh Tarik, Buah-buahan',
        notes: 'Ujian diagnostik in-memory PDF generator.',
        status: 'approved' as const,
        prices: { breakfast: 7.50, lunch: 12.50 },
        totalAmount: 1000.00,
        lang: 'bm' as const,
        invoiceNo: 'DIAG-2026-0001'
      };

      const pdfDoc = generateInvoicePDF(pdfData as unknown as Parameters<typeof generateInvoicePDF>[0], true, 'bm');
      const dataUri = pdfDoc.output('datauristring');
      if (dataUri && dataUri.startsWith('data:application/pdf')) {
        setDiagPdf({ status: 'pass', message: 'PDF generated successfully (Size: ' + Math.round(dataUri.length / 1024) + ' KB)' });
      } else {
        setDiagPdf({ status: 'fail', message: 'PDF output is invalid' });
      }
    } catch (err: unknown) {
      setDiagPdf({ status: 'fail', message: err instanceof Error ? err.message : 'PDF Generation threw an unexpected exception' });
    }
  };

  const runSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress) {
      toast({
        title: 'Error',
        description: 'Please enter a test recipient email address',
        variant: 'error'
      });
      return;
    }

    setIsSendingTestEmail(true);
    setDiagEmail({ status: 'running' });
    try {
      const response = await fetch(getApiUrl('/api/diagnostics/email'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ testEmail: testEmailAddress })
      });

      if (response.ok) {
        const data = await response.json();
        setDiagEmail({ status: 'pass', message: `Test email sent! Message ID: ${data.messageId}` });
        toast({
          title: 'Email Sent',
          description: 'Diagnostics test email dispatched successfully',
          variant: 'success'
        });
      } else {
        const data = await response.json();
        setDiagEmail({ status: 'fail', message: data.error || 'SMTP failed' });
        toast({
          title: 'Email Failed',
          description: data.error || 'Failed to send test email',
          variant: 'error'
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setDiagEmail({ status: 'fail', message: errorMsg });
      toast({
        title: 'Network Error',
        description: errorMsg,
        variant: 'error'
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const runAllDiagnostics = () => {
    runFirebaseDiag();
    runCalendarDiag();
    runNativeDiag();
    runPdfDiag();
  };

  const runFeatureTest = (feature: string) => {
    toast({
      title: 'Running Feature Test',
      description: `Initiated test runner for ${feature}`,
    });
  };

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
        <main className="page-shell__main pt-[calc(76px+var(--sat)+2rem)] max-w-4xl mx-auto space-y-6 px-4">
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

          {/* ADMIN ONLY SUB-MENU: Theme & Appearance, Live Updates, Diagnostics */}
          {isAdmin && (
            <section className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white dark:from-amber-950/30 dark:via-orange-950/15 dark:to-card border-2 border-amber-500/40 dark:border-amber-500/30 rounded-3xl p-6 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-500/20 pb-4 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-deep-forest dark:text-white flex items-center gap-2">
                      {language === 'bm' ? 'Kawalan Pentadbir (Admin Only)' : 'Admin Control Panel (Admin Only)'}
                    </h2>
                    <p className="text-xs text-stone dark:text-stone/75">
                      {language === 'bm'
                        ? 'Pengubahsuaian UI, siaran kemaskini langsung, dan diagnostik sistem.'
                        : 'UI customization, live update broadcasts, and system health diagnostics.'}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex-shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                  {language === 'bm' ? 'KHAS ADMIN' : 'ADMIN EXCLUSIVE'}
                </span>
              </div>

              {/* Sub-menu Tabs Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-stone-200/50 dark:bg-stone-900/50 border border-amber-500/20">
                <button
                  type="button"
                  onClick={async () => {
                    await triggerLightImpact();
                    setAdminSubTab('appearance');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    adminSubTab === 'appearance'
                      ? 'bg-amber-500 text-stone-950 font-extrabold shadow-md scale-[1.02]'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-300/30 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  <span>{language === 'bm' ? 'Tema & Penampilan' : 'Theme & Appearance'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await triggerLightImpact();
                    setAdminSubTab('updates');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    adminSubTab === 'updates'
                      ? 'bg-amber-500 text-stone-950 font-extrabold shadow-md scale-[1.02]'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-300/30 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>{language === 'bm' ? 'In-App Live Updates' : 'In-App Live Updates'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await triggerLightImpact();
                    setAdminSubTab('diagnostics');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    adminSubTab === 'diagnostics'
                      ? 'bg-amber-500 text-stone-950 font-extrabold shadow-md scale-[1.02]'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-300/30 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <Terminal className="w-4 h-4" />
                  <span>{language === 'bm' ? 'Diagnostik Sistem' : 'System Diagnostics'}</span>
                </button>
              </div>

              {/* Sub-tab 1: Theme & Appearance */}
              {adminSubTab === 'appearance' && (
                <div className="space-y-6 pt-2">
                  {/* Feature 1: Main Color Picker */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-deep-forest dark:text-white flex items-center gap-2">
                        <Paintbrush className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
                        {language === 'bm' ? 'Warna Utama Aplikasi (Main Accent Color)' : 'App Main Theme Color'}
                      </label>
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-stone/10 dark:bg-stone/20 text-deep-forest dark:text-white uppercase">
                        {customMainColor}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <input
                          type="color"
                          value={customMainColor}
                          onChange={async (e) => {
                            await triggerLightImpact();
                            setCustomMainColor(e.target.value);
                          }}
                          className="w-12 h-12 rounded-xl cursor-pointer border-2 border-border p-1 bg-white dark:bg-stone/20 shadow-sm transition-transform active:scale-95"
                          aria-label="Pick main theme color"
                        />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { name: 'Tomato Burst', hex: '#e03f14' },
                          { name: 'Royal Gold', hex: '#f69913' },
                          { name: 'Deep Forest', hex: '#0c453c' },
                          { name: 'Sapphire Blue', hex: '#2563eb' },
                          { name: 'Emerald Green', hex: '#059669' },
                          { name: 'Royal Purple', hex: '#7c3aed' },
                          { name: 'Crimson Red', hex: '#dc2626' },
                        ].map((preset) => (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={async () => {
                              await triggerLightImpact();
                              setCustomMainColor(preset.hex);
                            }}
                            title={preset.name}
                            style={{ backgroundColor: preset.hex }}
                            className={`w-8 h-8 rounded-xl border-2 transition-all duration-200 ${
                              customMainColor.toLowerCase() === preset.hex.toLowerCase()
                                ? 'border-white dark:border-white ring-2 ring-amber-500 scale-110 shadow-md'
                                : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Feature 2: Font Size Slider */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-deep-forest dark:text-white flex items-center gap-2">
                        <Type className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
                        {language === 'bm' ? 'Saiz Tulisan (Menu & Harga)' : 'Font Size Slider (Menu & Price)'}
                      </label>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone/10 dark:bg-stone/20 text-deep-forest dark:text-white">
                        {customFontSizePx}px ({Math.round((customFontSizePx / 16) * 100)}%)
                      </span>
                    </div>

                    <input
                      type="range"
                      min={12}
                      max={22}
                      step={1}
                      value={customFontSizePx}
                      onChange={async (e) => {
                        await triggerLightImpact();
                        setCustomFontSizePx(Number(e.target.value));
                      }}
                      className="w-full h-2 bg-stone/20 dark:bg-stone/30 rounded-lg appearance-none cursor-pointer accent-[var(--color-sunshine-cta)]"
                    />

                    {/* Live Font Size Text Preview */}
                    <div className="p-3 bg-white/80 dark:bg-stone/20 border border-border/80 rounded-2xl shadow-inner">
                      <div className="text-[11px] text-stone dark:text-stone/75 font-semibold mb-1 uppercase tracking-wider">
                        {language === 'bm' ? 'Pratonton Tulisan Langsung:' : 'Live Font Preview:'}
                      </div>
                      <p className="font-display font-bold text-deep-forest dark:text-white" style={{ fontSize: `${customFontSizePx}px` }}>
                        Nasi Briyani Ayam Rempah
                      </p>
                      <p className="font-semibold text-[var(--color-sunshine-cta)] mt-0.5" style={{ fontSize: `${Math.max(12, customFontSizePx - 1)}px` }}>
                        RM 15.00 / pax • Katering Lengkap Pak Usop
                      </p>
                    </div>
                  </div>

                  {/* Feature 3: Card / Item Size Slider (RecyclerView Scale) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-deep-forest dark:text-white flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
                        {language === 'bm' ? 'Saiz Kad / Item (RecyclerView Grid)' : 'Card / Item Size Slider (Grid)'}
                      </label>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone/10 dark:bg-stone/20 text-deep-forest dark:text-white">
                        {Math.round(customCardSizeScale * 100)}% ({customCardSizeScale < 0.95 ? (language === 'bm' ? 'Mampat' : 'Compact') : customCardSizeScale > 1.05 ? (language === 'bm' ? 'Besar' : 'Spacious') : (language === 'bm' ? 'Biasa' : 'Standard')})
                      </span>
                    </div>

                    <input
                      type="range"
                      min={80}
                      max={130}
                      step={5}
                      value={Math.round(customCardSizeScale * 100)}
                      onChange={async (e) => {
                        await triggerLightImpact();
                        setCustomCardSizeScale(Number(e.target.value) / 100);
                      }}
                      className="w-full h-2 bg-stone/20 dark:bg-stone/30 rounded-lg appearance-none cursor-pointer accent-[var(--color-sunshine-cta)]"
                    />

                    {/* Live Card Size Scale Preview */}
                    <div className="p-4 bg-white/80 dark:bg-stone/20 border border-border/80 rounded-2xl flex items-center justify-center overflow-hidden">
                      <div 
                        className="w-full max-w-[280px] p-3 rounded-2xl bg-white dark:bg-card border border-border shadow-sm flex items-center gap-3 transition-transform duration-150"
                        style={{ transform: `scale(${customCardSizeScale})`, transformOrigin: 'center center' }}
                      >
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-sunshine-cta)]/10 flex items-center justify-center text-[var(--color-sunshine-cta)] font-bold text-lg flex-shrink-0">
                          🍲
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-deep-forest dark:text-white truncate">
                            Asam Laksa Johore
                          </p>
                          <p className="text-xs font-semibold text-[var(--color-sunshine-cta)]">
                            RM 12.50
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature 4: Reset to Default Button */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        await triggerMediumImpact();
                        await resetUiToDefault();
                        toast({
                          title: language === 'bm' ? 'Seta Semula Tetapan UI' : 'UI Reset to Default',
                          description: language === 'bm' 
                            ? 'Warna utama, saiz tulisan dan saiz kad telah dipulihkan ke asal.' 
                            : 'Main color, font size, and card sizes have been restored to default.',
                          variant: 'success',
                        });
                      }}
                      className="rounded-2xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 min-h-[44px] px-5 font-semibold flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {language === 'bm' ? 'Seta Semula ke Asal (Reset Default)' : 'Reset to Default'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: In-App Live Updates */}
              {adminSubTab === 'updates' && (
                <div className="pt-2">
                  <AdminUpdatesTab
                    adminToken={adminToken}
                    onPreviewModal={(config) => setPreviewUpdateConfig(config)}
                  />
                </div>
              )}

              {/* Sub-tab 3: System Diagnostics */}
              {adminSubTab === 'diagnostics' && (
                <div className="pt-2">
                  <AdminDiagnosticsTab
                    diagFirebase={diagFirebase}
                    diagCalendar={diagCalendar}
                    diagPdf={diagPdf}
                    diagNative={diagNative}
                    diagEmail={diagEmail}
                    diagTests={diagTests}
                    testEmailAddress={testEmailAddress}
                    isSendingTestEmail={isSendingTestEmail}
                    erudaEnabled={erudaEnabled}
                    runAllDiagnostics={runAllDiagnostics}
                    runFirebaseDiag={runFirebaseDiag}
                    runCalendarDiag={runCalendarDiag}
                    runPdfDiag={runPdfDiag}
                    runNativeDiag={runNativeDiag}
                    runSendTestEmail={runSendTestEmail}
                    runFeatureTest={runFeatureTest}
                    toggleEruda={toggleEruda}
                    setTestEmailAddress={setTestEmailAddress}
                    setDiagTests={setDiagTests}
                  />
                </div>
              )}
            </section>
          )}

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

        {/* Live Update Preview Modal */}
        {previewUpdateConfig && (
          <InAppUpdateModal
            isOpen={Boolean(previewUpdateConfig)}
            config={previewUpdateConfig}
            isForceUpdate={previewUpdateConfig.forceUpdate}
            onDismiss={() => setPreviewUpdateConfig(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
