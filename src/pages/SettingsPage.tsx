import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getAssetUrl } from '@/lib/utils';
import { TransparentLogo } from '@/components/TransparentLogo';
import {
  ArrowLeft,
  Globe,
  Bell,
  Cpu,
  Type,
  RefreshCw,
  Palette,
  Shield,
  RotateCcw,
  Paintbrush,
  Terminal,
  Radio,
  Sun,
  Moon,
  Smartphone,
  Maximize2,
  ChevronRight,
  Vibrate,
  Volume2,
  Database,
  FileText,
  ShieldCheck,
  Code2,
  User as UserIcon,
  LogOut,
  Trash2,
  UserX,
  Cloud,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { triggerLightImpact, triggerMediumImpact, playClickSound } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';
import { useToast } from '@/components/ui/Toast';
import { useState, useEffect, useCallback } from 'react';
import { CURRENT_APP_VERSION, type AppVersionConfig } from '@/services/updateService';
import { AdminDiagnosticsTab } from '@/components/admin/AdminDiagnosticsTab';
import { AdminUpdatesTab } from '@/components/admin/AdminUpdatesTab';
import InAppUpdateModal from '@/components/InAppUpdateModal';
import { generateInvoicePDF } from '@/services/pdfService';
import { getApiUrl } from '@/lib/api';
import { DiagnosticConsole } from '@/components/DiagnosticConsole';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import {
  getPendingOrdersCount,
  autoSyncPendingOrders,
} from '@/lib/pendingOrdersQueue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

function BrandMark() {
  return (
    <div className="h-9 w-9 flex items-center justify-center">
      <TransparentLogo
        src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
        alt="Restoran Wawasan Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

interface SettingsRowProps {
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  title: string;
  action: React.ReactNode;
  isLast?: boolean;
}

function SettingsRow({
  icon: Icon,
  iconBg = 'bg-stone-100 dark:bg-stone-800',
  iconColor = 'text-stone-700 dark:text-stone-300',
  title,
  action,
  isLast = false,
}: SettingsRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3.5 px-4 sm:px-5 transition-colors ${
        !isLast ? 'border-b border-stone-200/70 dark:border-white/5' : ''
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold text-deep-forest dark:text-stone-100 truncate">
          {title}
        </span>
      </div>
      <div className="shrink-0 flex items-center">{action}</div>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {title && (
        <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
          {title}
        </h2>
      )}
      <div className="bg-white dark:bg-card border border-stone-200/80 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    developerMode,
    setDeveloperMode,
    fontSize,
    setFontSize,
    keepAwakeEnabled,
    setKeepAwakeEnabled,
    statusBarHidden,
    setStatusBarHidden,
    statusBarColor,
    setStatusBarColor,
    isAdmin,
    customMainColor,
    setCustomMainColor,
    customFontSizePx,
    setCustomFontSizePx,
    hapticsEnabled,
    soundEffectsEnabled,
    setHapticsEnabled,
    setSoundEffectsEnabled,
    resetUiToDefault,
  } = useSettings();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);

  // Storage & Cache states
  const [cacheSizeStr, setCacheSizeStr] = useState<string>('Calculating...');
  const [clearingCache, setClearingCache] = useState(false);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(() => getPendingOrdersCount());
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Modals state
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [licensesModalOpen, setLicensesModalOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);

  // Admin sub-menu active tab state ('appearance' | 'updates' | 'diagnostics')
  const [adminSubTab, setAdminSubTab] = useState<'appearance' | 'updates' | 'diagnostics'>('appearance');
  const [previewUpdateConfig, setPreviewUpdateConfig] = useState<AppVersionConfig | null>(null);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);

  // Measure cache size
  const calculateCacheSize = useCallback(async () => {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
        }
      }
      if ('caches' in window) {
        try {
          const cacheKeys = await caches.keys();
          totalBytes += cacheKeys.length * 150000;
        } catch {
          /* ignore */
        }
      }
      const mb = totalBytes / (1024 * 1024);
      if (mb < 0.1) {
        setCacheSizeStr(language === 'bm' ? '< 0.1 MB (Minimum)' : '< 0.1 MB (Clean)');
      } else {
        setCacheSizeStr(`${mb.toFixed(1)} MB`);
      }
    } catch {
      setCacheSizeStr('~ 0.5 MB');
    }
  }, [language]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    calculateCacheSize();
    setOfflinePendingCount(getPendingOrdersCount());
    return () => unsub();
  }, [calculateCacheSize]);

  // Handle Clear Cache
  const handleClearCache = async () => {
    await triggerMediumImpact();
    setClearingCache(true);
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      sessionStorage.clear();
      
      const keepKeys = [
        'wawasan_theme',
        'wawasan_language',
        'wawasan_admin_token',
        'wawasan_notifications_enabled',
        'wawasan_font_size',
      ];
      const preserved: Record<string, string> = {};
      keepKeys.forEach((k) => {
        const val = localStorage.getItem(k);
        if (val) preserved[k] = val;
      });

      localStorage.clear();
      Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v));

      await calculateCacheSize();
      setOfflinePendingCount(getPendingOrdersCount());

      toast({
        title: language === 'bm' ? 'Cache Berjaya Dikosongkan' : 'Cache Cleared Successfully',
        description: language === 'bm'
          ? 'Memori sementara dan pratonton telah dibersihkan.'
          : 'Temporary app cache and media buffers have been purged.',
        variant: 'success',
      });
    } catch {
      toast({
        title: language === 'bm' ? 'Gagal Membersihkan' : 'Clean Error',
        description: language === 'bm' ? 'Sila cuba sebentar lagi.' : 'Could not purge all cache items.',
        variant: 'error',
      });
    } finally {
      setClearingCache(false);
    }
  };

  // Handle Manual Offline Sync
  const handleManualSync = async () => {
    await triggerLightImpact();
    setSyncingOffline(true);
    try {
      const result = await autoSyncPendingOrders();
      setOfflinePendingCount(result.remainingCount);
      if (result.syncedCount > 0) {
        toast({
          title: language === 'bm' ? 'Penyegerakan Berjaya' : 'Sync Complete',
          description: language === 'bm'
            ? `${result.syncedCount} pesanan luar talian telah dihantar ke pelayan.`
            : `${result.syncedCount} offline orders synced to the cloud.`,
          variant: 'success',
        });
      } else if (result.remainingCount === 0) {
        toast({
          title: language === 'bm' ? 'Semua Data Terkini' : 'Already Up to Date',
          description: language === 'bm'
            ? 'Tiada pesanan luar talian yang menunggu.'
            : 'No pending offline orders found in queue.',
          variant: 'success',
        });
      } else {
        toast({
          title: language === 'bm' ? 'Penyegerakan Ditunda' : 'Sync Deferred',
          description: language === 'bm'
            ? 'Periksa sambungan internet anda.'
            : 'Please check your internet connection.',
          variant: 'error',
        });
      }
    } catch {
      toast({
        title: language === 'bm' ? 'Ralat Penyegerakan' : 'Sync Error',
        description: language === 'bm' ? 'Gagal menyegerak pesanan.' : 'Failed to synchronize offline orders.',
        variant: 'error',
      });
    } finally {
      setSyncingOffline(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    await triggerMediumImpact();
    setSignOutConfirmOpen(false);
    try {
      await signOut(auth);
      localStorage.removeItem('wawasan_admin_token');
      sessionStorage.removeItem('wawasan_session_started');
      toast({
        title: language === 'bm' ? 'Log Keluar Berjaya' : 'Signed Out',
        description: language === 'bm' ? 'Anda telah dilog keluar.' : 'You have been signed out securely.',
        variant: 'success',
      });
    } catch {
      toast({
        title: language === 'bm' ? 'Ralat Log Keluar' : 'Sign Out Failed',
        description: language === 'bm' ? 'Gagal melog keluar. Cuba lagi.' : 'Could not sign out.',
        variant: 'error',
      });
    }
  };

  // Diagnostics states
  const [diagFirebase, setDiagFirebase] = useState<{ status: 'idle' | 'running' | 'pass' | 'fail'; message?: string; projectId?: string }>({ status: 'idle' });
  const [diagFcm, setDiagFcm] = useState<{ status: 'idle' | 'running' | 'pass' | 'fail'; message?: string }>({ status: 'idle' });
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
    { id: 'combined_invoice', name: 'Combined Invoice Service', status: 'idle' },
    { id: 'consolidated_invoice', name: 'Consolidated Invoice Service', status: 'idle' },
    { id: 'db_latency', name: 'Cloud Firestore Ping', status: 'idle' },
    { id: 'auth_session', name: 'Admin Session Integrity', status: 'idle' }
  ]);

  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testPushTitle, setTestPushTitle] = useState('🔔 Ujian Notifikasi FCM / FCM Test Push');
  const [testPushBody, setTestPushBody] = useState('Notifikasi tolak berfungsi dengan cemerlang pada peranti anda!');
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);

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
        title: "Developer Console Enabled",
        description: "Inspector console initialized.",
      });
      try {
        const fetchDesc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
        const isFetchWritable = !fetchDesc || fetchDesc.writable || Boolean(fetchDesc.set);

        if (!isFetchWritable) {
          toast({
            title: "Unavailable in iFrame",
            description: "Open in a new window to inspect.",
            variant: "error"
          });
          return;
        }

        const erudaModule = await import('eruda');
        if (!document.getElementById('eruda') && !erudaWin.eruda) {
          erudaModule.default.init();
        }
      } catch (err) {
        console.error('Failed to load Eruda:', err);
        toast({
          title: "Console Load Failed",
          description: "Could not load eruda module.",
          variant: "error"
        });
      }
    } else {
      toast({
        title: "Console Disabled",
        description: "Inspector console closed.",
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
          message: data.message || 'Connected successfully' 
        });
      } else {
        setDiagFirebase({ 
          status: 'fail', 
          message: data.message || data.error || 'Failed to connect to Firestore' 
        });
      }
    } catch (err: unknown) {
      setDiagFirebase({ status: 'fail', message: err instanceof Error ? err.message : 'Network connection failed' });
    }
  };

  const runFcmDiag = async () => {
    setDiagFcm({ status: 'running' });
    try {
      const response = await fetch(getApiUrl('/api/diagnostics/fcm'), { headers: authHeaders() });
      const data = await response.json();
      if (response.ok && data.status === 'healthy') {
        setDiagFcm({
          status: 'pass',
          message: data.message || 'FCM messaging pipeline active (channels: order_status, new_orders)'
        });
      } else {
        setDiagFcm({
          status: 'fail',
          message: data.message || data.error || 'FCM service check failed'
        });
      }
    } catch (err: unknown) {
      setDiagFcm({ status: 'fail', message: err instanceof Error ? err.message : 'Network connection failed' });
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
        console.warn('Device info error:', e);
      }

      try {
        batteryInfo = (await Device.getBatteryInfo()) as unknown as Record<string, unknown>;
      } catch (e) {
        console.warn('Battery info error:', e);
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
        location: 'Putrajaya',
        quantity: 50,
        meals: ['breakfast', 'lunch'],
        menu: 'Nasi Lemak Ayam Goreng, Teh Tarik',
        notes: 'Ujian PDF generator.',
        status: 'approved' as const,
        prices: { breakfast: 7.50, lunch: 12.50 },
        totalAmount: 1000.00,
        lang: 'bm' as const,
        invoiceNo: 'DIAG-2026-0001'
      };

      const pdfDoc = generateInvoicePDF(pdfData as unknown as Parameters<typeof generateInvoicePDF>[0], true, 'bm');
      const dataUri = pdfDoc.output('datauristring');
      if (dataUri && dataUri.startsWith('data:application/pdf')) {
        setDiagPdf({ status: 'pass', message: `PDF generated (${Math.round(dataUri.length / 1024)} KB)` });
      } else {
        setDiagPdf({ status: 'fail', message: 'PDF output is invalid' });
      }
    } catch (err: unknown) {
      setDiagPdf({ status: 'fail', message: err instanceof Error ? err.message : 'PDF generation failed' });
    }
  };

  const runSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress) {
      toast({
        title: 'Email Required',
        description: 'Please enter a recipient email address',
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
        setDiagEmail({ status: 'pass', message: `Email sent (ID: ${data.messageId})` });
        toast({
          title: 'Email Dispatched',
          description: 'Test email delivered successfully.',
          variant: 'success'
        });
      } else {
        const data = await response.json();
        setDiagEmail({ status: 'fail', message: data.error || 'SMTP delivery failed' });
        toast({
          title: 'Email Failed',
          description: data.error || 'SMTP delivery failed',
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

  const runSendTestPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTestPush(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/send-test-push'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          target: 'topic',
          topic: 'new_orders',
          title: testPushTitle,
          body: testPushBody
        })
      });

      if (response.ok) {
        toast({
          title: 'FCM Push Dispatched',
          description: "Test notification broadcasted to topic 'new_orders'.",
          variant: 'success'
        });
      } else {
        const data = await response.json();
        toast({
          title: 'FCM Push Failed',
          description: data.error || 'Failed to dispatch push notification',
          variant: 'error'
        });
      }
    } catch (err: unknown) {
      toast({
        title: 'Network Error',
        description: err instanceof Error ? err.message : 'Push dispatch failed',
        variant: 'error'
      });
    } finally {
      setIsSendingTestPush(false);
    }
  };

  const runAllDiagnostics = () => {
    runFirebaseDiag();
    runFcmDiag();
    runCalendarDiag();
    runNativeDiag();
    runPdfDiag();
  };

  const runFeatureTest = (feature: string) => {
    toast({
      title: 'Testing Feature',
      description: `Testing ${feature}...`,
    });
  };

  const handleCheckForUpdates = async () => {
    await triggerMediumImpact();
    setCheckingUpdates(true);

    const onResult = ({ hasUpdate, error, config }: any) => {
      setCheckingUpdates(false);
      if (error) {
        toast({
          title: language === 'bm' ? 'Ralat Semakan' : 'Check Failed',
          description: language === 'bm' 
            ? 'Gagal menyemak kemaskini terkini.' 
            : 'Could not check for updates.',
          variant: 'error',
        });
        return;
      }

      if (hasUpdate && config) {
        toast({
          title: language === 'bm' ? 'Kemaskini Tersedia' : 'Update Available',
          description: `v${config.latestVersion} ${language === 'bm' ? 'sedia dimuat turun.' : 'is ready to download.'}`,
          variant: 'success',
        });
      } else {
        toast({
          title: language === 'bm' ? 'Aplikasi Terkini' : 'Up to Date',
          description: `v${CURRENT_APP_VERSION} ${language === 'bm' ? 'adalah versi terkini.' : 'is the latest version.'}`,
          variant: 'success',
        });
      }
    };

    window.dispatchEvent(new CustomEvent('app:check-updates-manually', {
      detail: { onResult }
    }));
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
  };

  const handleToggleStatusBarHidden = async (checked: boolean) => {
    await triggerLightImpact();
    setStatusBarHidden(checked);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cream dark:bg-background pb-28 sm:pb-32 relative">
        {/* Top Header */}
        <header className="glass-header fixed top-0 left-0 right-0 z-50 pt-[var(--sat)]">
          <div className="max-w-3xl mx-auto flex items-center justify-between px-4 sm:px-6 min-h-[58px] sm:min-h-[64px]">
            <button
              type="button"
              onClick={() => navigate('/home', { replace: true })}
              className="touch-target-row flex items-center gap-2.5 group text-left"
              aria-label="Go to home"
            >
              <BrandMark />
              <div>
                <span className="font-display font-bold text-lg page-header-text leading-tight block">
                  Restoran Wawasan
                </span>
                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-sunshine-cta)] leading-none mt-0.5">
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
              className="touch-target rounded-full h-9 px-3.5 text-stone-600 dark:text-stone-300 hover:text-deep-forest dark:hover:text-white font-semibold text-xs"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {language === 'bm' ? 'Kembali' : 'Back'}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main
          className="pt-24 sm:pt-28 max-w-2xl mx-auto px-4 sm:px-6 space-y-6"
          style={{ paddingTop: 'calc(76px + var(--sat, 0px))' }}
        >
          {/* Page Heading */}
          <div className="px-1 pt-1 pb-1">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-deep-forest dark:text-white tracking-tight">
              {language === 'bm' ? 'Tetapan' : 'Settings'}
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm mt-0.5">
              {language === 'bm'
                ? 'Pilihan aplikasi dan konfigurasi sistem.'
                : 'Application preferences and system configuration.'}
            </p>
          </div>

          {/* ADMIN MANAGEMENT CARD (If Logged In) */}
          {isAdmin && (
            <div className="border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-deep-forest dark:text-white">
                      {language === 'bm' ? 'Kawalan Pentadbir' : 'Admin Controls'}
                    </h2>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      {language === 'bm' ? 'Penyesuaian UI & Diagnostik' : 'UI Customization & Diagnostics'}
                    </span>
                  </div>
                </div>

                {/* Sub Tab Segmented Control */}
                <div className="flex items-center p-1 rounded-xl bg-stone-200/60 dark:bg-stone-800/80 text-xs">
                  <button
                    type="button"
                    onClick={async () => {
                      await triggerLightImpact();
                      setAdminSubTab('appearance');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                      adminSubTab === 'appearance'
                        ? 'bg-white dark:bg-card text-deep-forest dark:text-white shadow-2xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-deep-forest dark:hover:text-white'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5 inline mr-1" />
                    UI
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await triggerLightImpact();
                      setAdminSubTab('updates');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                      adminSubTab === 'updates'
                        ? 'bg-white dark:bg-card text-deep-forest dark:text-white shadow-2xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-deep-forest dark:hover:text-white'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 inline mr-1" />
                    Updates
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await triggerLightImpact();
                      setAdminSubTab('diagnostics');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                      adminSubTab === 'diagnostics'
                        ? 'bg-white dark:bg-card text-deep-forest dark:text-white shadow-2xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-deep-forest dark:hover:text-white'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 inline mr-1" />
                    Diag
                  </button>
                </div>
              </div>

              {/* Tab Content 1: Appearance Customizer */}
              {adminSubTab === 'appearance' && (
                <div className="space-y-4 pt-2 border-t border-amber-500/20">
                  {/* Theme Accent Color */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-deep-forest dark:text-stone-200 flex items-center gap-1.5">
                      <Paintbrush className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {language === 'bm' ? 'Warna Aksen' : 'Accent Color'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { name: 'Terracotta', hex: '#a3310e' },
                        { name: 'Gold', hex: '#f69913' },
                        { name: 'Forest', hex: '#0c453c' },
                        { name: 'Carrot', hex: '#e96212' },
                        { name: 'Tomato', hex: '#e03f14' },
                      ].map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={async () => {
                            await triggerLightImpact();
                            setCustomMainColor(preset.hex);
                          }}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            customMainColor.toLowerCase() === preset.hex.toLowerCase()
                              ? 'ring-2 ring-amber-500 scale-115 shadow-2xs'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                        />
                      ))}
                      <div className="relative ml-1">
                        <input
                          type="color"
                          value={/^#[0-9A-Fa-f]{6}$/.test(customMainColor) ? customMainColor.toLowerCase() : '#000000'}
                          onChange={(e) => {
                            setCustomMainColor(e.target.value.toUpperCase());
                          }}
                          className="w-6 h-6 rounded-full cursor-pointer border border-border p-0 bg-transparent overflow-hidden"
                          aria-label="Custom color"
                        />
                      </div>
                    </div>
                  </div>

                  {/* UI Scale / Font Size Slider */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-deep-forest dark:text-stone-200 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {language === 'bm' ? 'Skala Tipografi' : 'Type Scale'}
                    </span>
                    <div className="flex items-center gap-3 w-44">
                      <input
                        type="range"
                        min={12}
                        max={20}
                        step={1}
                        value={customFontSizePx}
                        onChange={(e) => setCustomFontSizePx(Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <span className="font-mono text-xs text-stone-500 shrink-0 w-8 text-right">
                        {customFontSizePx}px
                      </span>
                    </div>
                  </div>

                  {/* Reset Defaults */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await triggerMediumImpact();
                        await resetUiToDefault();
                        toast({
                          title: language === 'bm' ? 'Tetapan Diset Semula' : 'Reset Complete',
                          description: language === 'bm' ? 'Warna dan saiz telah kembali ke asal.' : 'Theme parameters restored to default.',
                          variant: 'success'
                        });
                      }}
                      className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {language === 'bm' ? 'Seta Semula' : 'Reset to Default'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Content 2: In-App Updates */}
              {adminSubTab === 'updates' && (
                <div className="pt-2 border-t border-amber-500/20">
                  <AdminUpdatesTab
                    adminToken={adminToken}
                    onPreviewModal={(config) => setPreviewUpdateConfig(config)}
                  />
                </div>
              )}

              {/* Tab Content 3: System Diagnostics */}
              {adminSubTab === 'diagnostics' && (
                <div className="pt-2 border-t border-amber-500/20">
                  <AdminDiagnosticsTab
                    diagFirebase={diagFirebase}
                    diagFcm={diagFcm}
                    diagCalendar={diagCalendar}
                    diagPdf={diagPdf}
                    diagNative={diagNative}
                    diagEmail={diagEmail}
                    diagTests={diagTests}
                    testEmailAddress={testEmailAddress}
                    isSendingTestEmail={isSendingTestEmail}
                    testPushTitle={testPushTitle}
                    testPushBody={testPushBody}
                    isSendingTestPush={isSendingTestPush}
                    erudaEnabled={erudaEnabled}
                    runAllDiagnostics={runAllDiagnostics}
                    runFirebaseDiag={runFirebaseDiag}
                    runFcmDiag={runFcmDiag}
                    runCalendarDiag={runCalendarDiag}
                    runPdfDiag={runPdfDiag}
                    runNativeDiag={runNativeDiag}
                    runSendTestEmail={runSendTestEmail}
                    runSendTestPush={runSendTestPush}
                    runFeatureTest={runFeatureTest}
                    toggleEruda={toggleEruda}
                    setTestEmailAddress={setTestEmailAddress}
                    setTestPushTitle={setTestPushTitle}
                    setTestPushBody={setTestPushBody}
                    setDiagTests={setDiagTests}
                  />
                </div>
              )}
            </div>
          )}

          {/* SECTION 1: ACCOUNT & SECURITY */}
          <SettingsSection title={language === 'bm' ? 'Akaun & Keselamatan' : 'Account & Security'}>
            {currentUser || isAdmin ? (
              <>
                <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-stone-200/70 dark:border-white/5 bg-stone-50/50 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--color-sunshine-cta)]/15 text-[var(--color-sunshine-cta)] flex items-center justify-center font-bold font-display text-base shrink-0">
                      {currentUser?.displayName
                        ? currentUser.displayName.charAt(0).toUpperCase()
                        : currentUser?.email
                        ? currentUser.email.charAt(0).toUpperCase()
                        : 'W'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-deep-forest dark:text-white truncate">
                        {currentUser?.displayName || (isAdmin ? 'Pentadbir Wawasan' : 'Pelanggan Wawasan')}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                        {currentUser?.email || (isAdmin ? 'admin@wawasanpakusop.my' : 'Sesi Aktif')}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    {language === 'bm' ? 'Aktif' : 'Active'}
                  </span>
                </div>

                <SettingsRow
                  icon={UserIcon}
                  iconBg="bg-blue-500/10"
                  iconColor="text-blue-600 dark:text-blue-400"
                  title={language === 'bm' ? 'Profil & Alamat Penghantaran' : 'Profile & Delivery Address'}
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await triggerLightImpact();
                        navigate('/profile');
                      }}
                      className="h-8 px-3 text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-deep-forest dark:hover:text-white flex items-center gap-1 rounded-xl"
                    >
                      <span>{language === 'bm' ? 'Urus' : 'Manage'}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                    </Button>
                  }
                />

                <SettingsRow
                  icon={LogOut}
                  iconBg="bg-amber-500/10"
                  iconColor="text-amber-600 dark:text-amber-400"
                  title={language === 'bm' ? 'Log Keluar' : 'Sign Out'}
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await triggerLightImpact();
                        setSignOutConfirmOpen(true);
                      }}
                      className="h-8 px-3 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl"
                    >
                      {language === 'bm' ? 'Keluar' : 'Sign Out'}
                    </Button>
                  }
                />

                <SettingsRow
                  icon={UserX}
                  iconBg="bg-rose-500/10"
                  iconColor="text-rose-600 dark:text-rose-400"
                  title={language === 'bm' ? 'Padam Akaun & Data' : 'Delete Account & Data'}
                  isLast={true}
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await triggerLightImpact();
                        setDeleteAccountModalOpen(true);
                      }}
                      className="h-8 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl"
                    >
                      {language === 'bm' ? 'Permintaan' : 'Request'}
                    </Button>
                  }
                />
              </>
            ) : (
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-deep-forest dark:text-white">
                      {language === 'bm' ? 'Mod Pelawat (Tetamu)' : 'Guest Mode'}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {language === 'bm'
                        ? 'Log masuk untuk simpan tempahan katering & invois anda.'
                        : 'Sign in to sync your bookings and order history across devices.'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    await triggerLightImpact();
                    navigate('/profile');
                  }}
                  className="w-full sm:w-auto h-8 px-4 rounded-xl text-xs font-bold bg-[var(--color-sunshine-cta)] text-deep-forest hover:brightness-105 shadow-2xs"
                >
                  {language === 'bm' ? 'Log Masuk / Daftar' : 'Sign In / Register'}
                </Button>
              </div>
            )}
          </SettingsSection>

          {/* SECTION 2: PREFERENCES */}
          <SettingsSection title={language === 'bm' ? 'Pilihan Paparan' : 'Preferences'}>
            {/* Language Selector */}
            <SettingsRow
              icon={Globe}
              iconBg="bg-blue-500/10"
              iconColor="text-blue-600 dark:text-blue-400"
              title={language === 'bm' ? 'Bahasa' : 'Language'}
              action={
                <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      language === 'en'
                        ? 'bg-white dark:bg-card text-deep-forest dark:text-white font-bold shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('bm')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      language === 'bm'
                        ? 'bg-white dark:bg-card text-deep-forest dark:text-white font-bold shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    Melayu
                  </button>
                </div>
              }
            />

            {/* Theme Mode */}
            <SettingsRow
              icon={Palette}
              iconBg="bg-amber-500/10"
              iconColor="text-amber-600 dark:text-amber-400"
              title={language === 'bm' ? 'Tema Warna' : 'Appearance'}
              action={
                <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={async () => {
                      await triggerLightImpact();
                      setTheme('light');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      theme === 'light'
                        ? 'bg-white dark:bg-card text-amber-600 font-bold shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{language === 'bm' ? 'Siang' : 'Light'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await triggerLightImpact();
                      setTheme('dark');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      theme === 'dark'
                        ? 'bg-white dark:bg-card text-amber-300 font-bold shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{language === 'bm' ? 'Malam' : 'Dark'}</span>
                  </button>
                </div>
              }
            />

            {/* Text Sizing */}
            <SettingsRow
              icon={Type}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-600 dark:text-emerald-400"
              title={language === 'bm' ? 'Saiz Tulisan' : 'Text Size'}
              isLast={true}
              action={
                <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold">
                  {(['sm', 'base', 'lg', 'xl'] as const).map((size) => {
                    const label = size === 'sm' ? 'S' : size === 'base' ? 'M' : size === 'lg' ? 'L' : 'XL';
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={async () => {
                          await triggerLightImpact();
                          setFontSize(size);
                        }}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                          fontSize === size
                            ? 'bg-white dark:bg-card text-deep-forest dark:text-white font-bold shadow-2xs'
                            : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              }
            />
          </SettingsSection>

          {/* SECTION 3: NOTIFICATIONS */}
          <SettingsSection title={language === 'bm' ? 'Pemberitahuan' : 'Notifications'}>
            <SettingsRow
              icon={Bell}
              iconBg="bg-rose-500/10"
              iconColor="text-rose-600 dark:text-rose-400"
              title={language === 'bm' ? 'Notifikasi Push' : 'Push Notifications'}
              isLast={true}
              action={
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={handleToggleNotifications}
                  aria-label="Toggle notifications"
                />
              }
            />
          </SettingsSection>

          {/* SECTION 4: HAPTICS & SOUND FX */}
          <SettingsSection title={language === 'bm' ? 'Maklum Balas Sentuhan & Bunyi' : 'Haptics & Audio'}>
            <SettingsRow
              icon={Vibrate}
              iconBg="bg-teal-500/10"
              iconColor="text-teal-600 dark:text-teal-400"
              title={language === 'bm' ? 'Getaran Maklum Balas (Haptic)' : 'Haptic Feedback'}
              action={
                <Switch
                  checked={hapticsEnabled}
                  onCheckedChange={async (checked) => {
                    setHapticsEnabled(checked);
                    if (checked) {
                      await triggerMediumImpact();
                    }
                  }}
                  aria-label="Toggle haptic feedback"
                />
              }
            />

            <SettingsRow
              icon={Volume2}
              iconBg="bg-violet-500/10"
              iconColor="text-violet-600 dark:text-violet-400"
              title={language === 'bm' ? 'Kesan Bunyi Sentuhan (Sound FX)' : 'Touch & Click Sound Effects'}
              isLast={true}
              action={
                <div className="flex items-center gap-2">
                  {soundEffectsEnabled && (
                    <button
                      type="button"
                      onClick={() => playClickSound('force')}
                      className="px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-700 dark:text-violet-300 font-bold text-[11px] transition-colors"
                      title="Uji Bunyi Klik"
                    >
                      {language === 'bm' ? 'Uji Bunyi' : 'Test Sound'}
                    </button>
                  )}
                  <Switch
                    checked={soundEffectsEnabled}
                    onCheckedChange={(checked) => {
                      setSoundEffectsEnabled(checked);
                      if (checked) {
                        playClickSound('force');
                      }
                      triggerLightImpact();
                    }}
                    aria-label="Toggle touch sounds"
                  />
                </div>
              }
            />
          </SettingsSection>

          {/* SECTION 5: DEVICE & DISPLAY */}
          <SettingsSection title={language === 'bm' ? 'Peranti & Paparan' : 'Device & Display'}>
            <SettingsRow
              icon={Smartphone}
              iconBg="bg-purple-500/10"
              iconColor="text-purple-600 dark:text-purple-400"
              title={language === 'bm' ? 'Kekalkan Skrin Aktif' : 'Keep Screen Awake'}
              action={
                <Switch
                  checked={keepAwakeEnabled}
                  onCheckedChange={handleToggleKeepAwake}
                  aria-label="Toggle keep screen awake"
                />
              }
            />

            <SettingsRow
              icon={Maximize2}
              iconBg="bg-teal-500/10"
              iconColor="text-teal-600 dark:text-teal-400"
              title={language === 'bm' ? 'Mod Skrin Penuh (Imersif)' : 'Immersive Fullscreen'}
              isLast={statusBarHidden}
              action={
                <Switch
                  checked={statusBarHidden}
                  onCheckedChange={handleToggleStatusBarHidden}
                  aria-label="Toggle immersive mode"
                />
              }
            />

            {!statusBarHidden && (
              <SettingsRow
                icon={Palette}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-600 dark:text-orange-400"
                title={language === 'bm' ? 'Warna Bar Status' : 'Status Bar Color'}
                isLast={true}
                action={
                  <div className="flex items-center gap-1.5">
                    {[
                      { name: 'Terracotta', hex: '#a3310e' },
                      { name: 'Dark Slate', hex: '#121212' },
                      { name: 'Deep Forest', hex: '#0c453c' },
                      { name: 'Gold', hex: '#f69913' },
                    ].map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={async () => {
                          await triggerLightImpact();
                          setStatusBarColor(preset.hex);
                        }}
                        style={{ backgroundColor: preset.hex }}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          statusBarColor.toLowerCase() === preset.hex.toLowerCase()
                            ? 'ring-2 ring-[var(--color-sunshine-cta)] scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={preset.name}
                      />
                    ))}
                  </div>
                }
              />
            )}
          </SettingsSection>

          {/* SECTION 5: STORAGE & CACHE MANAGEMENT */}
          <SettingsSection title={language === 'bm' ? 'Storan & Cache' : 'Storage & Cache'}>
            <SettingsRow
              icon={Database}
              iconBg="bg-cyan-500/10"
              iconColor="text-cyan-600 dark:text-cyan-400"
              title={language === 'bm' ? 'Saiz Cache Aplikasi' : 'App Cache & Data'}
              action={
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                    {cacheSizeStr}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={clearingCache}
                    className="h-8 px-2.5 text-xs font-semibold rounded-xl border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-1"
                  >
                    <Trash2 className={`w-3 h-3 ${clearingCache ? 'animate-spin' : ''}`} />
                    <span>{language === 'bm' ? 'Kosongkan' : 'Clear'}</span>
                  </Button>
                </div>
              }
            />

            <SettingsRow
              icon={Cloud}
              iconBg="bg-sky-500/10"
              iconColor="text-sky-600 dark:text-sky-400"
              title={language === 'bm' ? 'Penyegerakan Luar Talian' : 'Offline Orders Sync'}
              isLast={true}
              action={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {offlinePendingCount > 0
                      ? `${offlinePendingCount} ${language === 'bm' ? 'menunggu' : 'pending'}`
                      : (language === 'bm' ? 'Terkini' : 'Synced')}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleManualSync}
                    disabled={syncingOffline}
                    className="h-8 px-2.5 text-xs font-semibold rounded-xl border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingOffline ? 'animate-spin' : ''}`} />
                    <span>{language === 'bm' ? 'Segerak' : 'Sync'}</span>
                  </Button>
                </div>
              }
            />
          </SettingsSection>

          {/* SECTION 6: LEGAL & PRIVACY */}
          <SettingsSection title={language === 'bm' ? 'Perundangan & Privasi' : 'Legal & Privacy'}>
            <SettingsRow
              icon={ShieldCheck}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-600 dark:text-emerald-400"
              title={language === 'bm' ? 'Dasar Privasi (PDPA 2010)' : 'Privacy Policy'}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await triggerLightImpact();
                    setPrivacyModalOpen(true);
                  }}
                  className="h-8 px-3 text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-deep-forest dark:hover:text-white flex items-center gap-1 rounded-xl"
                >
                  <span>{language === 'bm' ? 'Lihat' : 'View'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </Button>
              }
            />

            <SettingsRow
              icon={FileText}
              iconBg="bg-indigo-500/10"
              iconColor="text-indigo-600 dark:text-indigo-400"
              title={language === 'bm' ? 'Terma & Syarat Perkhidmatan' : 'Terms of Service'}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await triggerLightImpact();
                    setTermsModalOpen(true);
                  }}
                  className="h-8 px-3 text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-deep-forest dark:hover:text-white flex items-center gap-1 rounded-xl"
                >
                  <span>{language === 'bm' ? 'Lihat' : 'View'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </Button>
              }
            />

            <SettingsRow
              icon={Code2}
              iconBg="bg-slate-500/10"
              iconColor="text-slate-600 dark:text-slate-400"
              title={language === 'bm' ? 'Lesen Sumber Terbuka' : 'Open-Source Licenses'}
              isLast={true}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await triggerLightImpact();
                    setLicensesModalOpen(true);
                  }}
                  className="h-8 px-3 text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-deep-forest dark:hover:text-white flex items-center gap-1 rounded-xl"
                >
                  <span>{language === 'bm' ? 'Lihat' : 'View'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </Button>
              }
            />
          </SettingsSection>

          {/* SECTION 7: SYSTEM & DIAGNOSTICS */}
          <SettingsSection title={language === 'bm' ? 'Sistem & Diagnostik' : 'System & Tools'}>
            <SettingsRow
              icon={Cpu}
              iconBg="bg-indigo-500/10"
              iconColor="text-indigo-600 dark:text-indigo-400"
              title={language === 'bm' ? 'Mod Pembangun' : 'Developer Mode'}
              action={
                <Switch
                  checked={developerMode}
                  onCheckedChange={handleToggleDeveloper}
                  aria-label="Toggle developer mode"
                />
              }
            />

            <SettingsRow
              icon={Terminal}
              iconBg="bg-zinc-500/10"
              iconColor="text-zinc-600 dark:text-zinc-400"
              title={language === 'bm' ? 'Konsol Diagnostik' : 'Diagnostics Console'}
              isLast={true}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await triggerLightImpact();
                    setDiagnosticOpen(true);
                  }}
                  className="h-8 px-3 text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-deep-forest dark:hover:text-white flex items-center gap-1 rounded-xl"
                >
                  <span>{language === 'bm' ? 'Buka' : 'Open'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </Button>
              }
            />
          </SettingsSection>

          {/* SECTION 8: APP INFO & VERSION */}
          <div className="pt-2 pb-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card border border-stone-200/80 dark:border-white/10 shadow-2xs flex items-center justify-center p-2.5">
              <TransparentLogo
                src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
                alt="Wawasan Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <p className="text-sm font-bold text-deep-forest dark:text-white">
                Restoran Wawasan Pak Usop
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
                v{CURRENT_APP_VERSION}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCheckForUpdates}
              disabled={checkingUpdates}
              className="h-8 rounded-xl px-3.5 text-xs font-semibold text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3 h-3 ${checkingUpdates ? 'animate-spin' : ''}`} />
              {checkingUpdates
                ? (language === 'bm' ? 'Menyemak...' : 'Checking...')
                : (language === 'bm' ? 'Semak Kemaskini' : 'Check for Updates')}
            </Button>

            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              &copy; {new Date().getFullYear()} Restoran Wawasan. All rights reserved.
            </p>
          </div>
        </main>

        {/* DIALOG 1: PRIVACY POLICY */}
        <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                {language === 'bm' ? 'Dasar Privasi' : 'Privacy Policy'}
              </DialogTitle>
              <DialogDescription>
                {language === 'bm'
                  ? 'Pematuhan Akta Perlindungan Data Peribadi 2010 (PDPA) Malaysia'
                  : 'Personal Data Protection Act 2010 (PDPA) Compliance'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed py-2">
              <div className="space-y-1.5">
                <h4 className="font-bold text-deep-forest dark:text-white text-sm">
                  {language === 'bm' ? '1. Maklumat Yang Dikumpul' : '1. Information We Collect'}
                </h4>
                <p>
                  {language === 'bm'
                    ? 'Restoran Wawasan mengumpul maklumat yang anda berikan secara sukarela semasa membuat pesanan katering, termasuk nama penuh, nombor telefon WhatsApp, alamat penghantaran/lokasi majlis, tarikh acara, dan pilihan menu makanan.'
                    : 'Restoran Wawasan collects information you voluntarily provide when requesting catering quotes or placing orders, including full name, WhatsApp phone number, delivery/event venue address, event date, and menu preferences.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-deep-forest dark:text-white text-sm">
                  {language === 'bm' ? '2. Tujuan Penggunaan Data' : '2. How We Use Your Data'}
                </h4>
                <p>
                  {language === 'bm'
                    ? 'Maklumat anda digunakan secara eksklusif untuk penyediaan sebut harga, pengesahan jadual katering, penjanaan invois PDF rasmi, penghantaran makanan ke lokasi majlis, dan komunikasi status pesanan.'
                    : 'Your information is used exclusively to generate quotation proposals, schedule catering logistics, create official PDF invoices, arrange on-time food delivery to your venue, and send order status updates.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-deep-forest dark:text-white text-sm">
                  {language === 'bm' ? '3. Keselamatan & Perlindungan' : '3. Security & Non-Disclosure'}
                </h4>
                <p>
                  {language === 'bm'
                    ? 'Kami TIDAK AKAN menjual, menyewa, atau berkongsi data peribadi anda kepada mana-mana pihak ketiga bagi tujuan pemasaran. Semua penghantaran data disulitkan menggunakan standard industri SSL/TLS.'
                    : 'We NEVER sell, rent, or disclose your personal data to third parties for marketing. All data transmissions are encrypted using industry-standard SSL/TLS protocols.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-deep-forest dark:text-white text-sm">
                  {language === 'bm' ? '4. Hak Pemadaman & Akses' : '4. Your Rights & Data Erasure'}
                </h4>
                <p>
                  {language === 'bm'
                    ? 'Anda berhak untuk menyemak, mengemas kini, atau meminta pemadaman sepenuhnya rekod profil anda pada bila-bila masa melalui tetapan akaun aplikasi atau menghubungi pengurusan Restoran Wawasan.'
                    : 'You have the right to review, update, or request permanent deletion of your profile and cached data at any time via the in-app account settings or by contacting our management team.'}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setPrivacyModalOpen(false)}
                className="w-full sm:w-auto font-bold bg-[var(--color-sunshine-cta)] text-deep-forest hover:brightness-105 rounded-xl text-xs h-9"
              >
                {language === 'bm' ? 'Faham & Tutup' : 'Understood'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG 2: TERMS OF SERVICE */}
        <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {language === 'bm' ? 'Terma & Syarat Perkhidmatan' : 'Terms of Service'}
              </DialogTitle>
              <DialogDescription>
                {language === 'bm'
                  ? 'Garis panduan pesanan dan perkhidmatan katering Restoran Wawasan'
                  : 'Catering orders, booking guidelines, and service agreements'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed py-2">
              <div className="space-y-1.5">
                <h4 className="font-bold text-deep-forest dark:text-white text-sm">
                  {language === 'bm' ? '1. Tempahan Katering & Notis Awal' : '1. Catering Bookings & Lead Time'}
                </h4>
                <p>
                  {language === 'bm'
                    ? 'Semua pakej katering bufet dan jamuan kenduri memerlukan tempahan sekurang-kurangnya 48 jam sebelum tarikh acara bagi memastikan persiapan bahan mentah segar dan kualiti hidangan terbaik.'
                    : 'All buffet catering and large banquet orders require a minimum booking lead time of 48 hours prior to the event date to ensure fresh ingredient procurement and top-tier preparation.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-deep-forest dark:text-white text-sm">
                  {language === 'bm' ? '2. Deposit & Pembayaran' : '2. Deposit & Payment Terms'}
                </h4>
                <p>
                  {language === 'bm'
                    ? 'Deposit komitmen sebanyak 30% daripada jumlah sebut harga diperlukan untuk mengesahkan tempahan slot tarikh acara. Baki bayaran hendaklah diselesaikan sebelum atau semasa hari penghantaran.'
                    : 'A 30% confirmation deposit is required to secure your event date. The remaining balance must be settled prior to or upon delivery on the event day.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-deep-forest dark:text-white text-sm">
                  {language === 'bm' ? '3. Kawasan Liputan Penghantaran' : '3. Delivery Coverage'}
                </h4>
                <p>
                  {language === 'bm'
                    ? 'Perkhidmatan katering kami meliputi kawasan Putrajaya, Cyberjaya, Bangi, Kajang, Sepang, Puchong, dan kawasan terpilih di Lembah Klang / Selangor. Caj penghantaran bergantung kepada jarak lokasi majlis.'
                    : 'Our catering service covers Putrajaya, Cyberjaya, Bangi, Kajang, Sepang, Puchong, and selected Klang Valley / Selangor regions. Delivery logistics fees vary based on venue distance.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-deep-forest dark:text-white text-sm">
                  {language === 'bm' ? '4. Pembatalan & Pindaan Tarikh' : '4. Cancellations & Date Changes'}
                </h4>
                <p>
                  {language === 'bm'
                    ? 'Pindaan tarikh dibenarkan tertakluk kepada kekosongan slot sekiranya dimaklumkan sekurang-kurangnya 3 hari sebelum acara. Pembatalan saat akhir mungkin tertakluk kepada caj penyediaan.'
                    : 'Date reschedulings are subject to calendar availability if notified at least 3 days prior. Last-minute cancellations may incur preparation charges.'}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="w-full sm:w-auto font-bold bg-[var(--color-sunshine-cta)] text-deep-forest hover:brightness-105 rounded-xl text-xs h-9"
              >
                {language === 'bm' ? 'Tutup' : 'Close'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG 3: OPEN SOURCE LICENSES */}
        <Dialog open={licensesModalOpen} onOpenChange={setLicensesModalOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {language === 'bm' ? 'Lesen Sumber Terbuka' : 'Open-Source Licenses'}
              </DialogTitle>
              <DialogDescription>
                {language === 'bm'
                  ? 'Aplikasi ini dibina dengan bangga menggunakan komponen perisian sumber terbuka berikut:'
                  : 'This application is proudly built with the following open-source software libraries:'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs text-stone-700 dark:text-stone-300 py-2">
              {[
                { name: 'React 18 & React DOM', license: 'MIT License', desc: 'The library for web and native user interfaces' },
                { name: 'Capacitor Core & Plugins', license: 'MIT License', desc: 'Cross-platform native mobile runtime' },
                { name: 'Tailwind CSS', license: 'MIT License', desc: 'A utility-first CSS framework for rapid UI styling' },
                { name: 'Lucide React', license: 'ISC License', desc: 'Beautiful & consistent icon library' },
                { name: 'Firebase JavaScript SDK', license: 'Apache License 2.0', desc: 'Realtime database, authentication & cloud persistence' },
                { name: 'Radix UI Primitives', license: 'MIT License', desc: 'Accessible, unstyled UI component primitives' },
                { name: 'Motion', license: 'MIT License', desc: 'Production-ready motion and animation library for React' },
                { name: 'Vite', license: 'MIT License', desc: 'Next-generation frontend build tooling' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/60 dark:border-white/5 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-deep-forest dark:text-white text-xs">{item.name}</p>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                      {item.license}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">{item.desc}</p>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setLicensesModalOpen(false)}
                className="w-full sm:w-auto font-bold bg-[var(--color-sunshine-cta)] text-deep-forest hover:brightness-105 rounded-xl text-xs h-9"
              >
                {language === 'bm' ? 'Tutup' : 'Close'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG 4: SIGN OUT CONFIRMATION */}
        <Dialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <LogOut className="w-5 h-5" />
                {language === 'bm' ? 'Sahkan Log Keluar' : 'Confirm Sign Out'}
              </DialogTitle>
              <DialogDescription>
                {language === 'bm'
                  ? 'Adakah anda pasti mahu log keluar daripada sesi aktif ini?'
                  : 'Are you sure you want to sign out of your current session?'}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSignOutConfirmOpen(false)}
                className="rounded-xl text-xs font-semibold"
              >
                {language === 'bm' ? 'Batal' : 'Cancel'}
              </Button>
              <Button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700"
              >
                {language === 'bm' ? 'Ya, Log Keluar' : 'Yes, Sign Out'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG 5: DELETE ACCOUNT & DATA REQUEST */}
        <Dialog open={deleteAccountModalOpen} onOpenChange={setDeleteAccountModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                {language === 'bm' ? 'Pemadaman Akaun & Data' : 'Delete Account & Data'}
              </DialogTitle>
              <DialogDescription>
                {language === 'bm'
                  ? 'Pematuhan standard dasar privasi Google Play Store & Apple App Store'
                  : 'Google Play & Apple App Store Privacy & Data Erasure Compliance'}
              </DialogDescription>
            </DialogHeader>

            <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 space-y-3 py-2">
              <p>
                {language === 'bm'
                  ? 'Memadam akaun akan mengeluarkan profil, sesi aktif, dan semua data cache daripada peranti ini serta-merta.'
                  : 'Deleting your account will immediately purge your profile, active session credentials, and local cached data from this device.'}
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                <p className="font-bold">
                  {language === 'bm' ? 'Permintaan Audit PDPA:' : 'Permanent PDPA Audit Erasure:'}
                </p>
                <p>
                  {language === 'bm'
                    ? 'Untuk memadam rekod pesanan arkib dari pangkalan data pelayan awam, sila emel kepada pengurusan kami di madnor.noisy@gmail.com dengan tajuk [Permintaan Padam Data].'
                    : 'To erase archived server records from our cloud database, please email management at madnor.noisy@gmail.com with subject [Data Erasure Request].'}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteAccountModalOpen(false)}
                className="rounded-xl text-xs font-semibold"
              >
                {language === 'bm' ? 'Batal' : 'Cancel'}
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  await handleClearCache();
                  await handleSignOut();
                  setDeleteAccountModalOpen(false);
                }}
                className="rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
              >
                {language === 'bm' ? 'Padam & Log Keluar' : 'Purge & Sign Out'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Live Update Preview Modal */}
        {previewUpdateConfig && (
          <InAppUpdateModal
            isOpen={Boolean(previewUpdateConfig)}
            config={previewUpdateConfig}
            isForceUpdate={previewUpdateConfig.forceUpdate}
            onDismiss={() => setPreviewUpdateConfig(null)}
          />
        )}

        {/* Diagnostic Console */}
        <DiagnosticConsole
          isOpen={diagnosticOpen}
          onClose={() => setDiagnosticOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
