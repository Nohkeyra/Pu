import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { 
  Smartphone, 
  Bell, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  BatteryCharging, 
  CheckCircle2, 
  RefreshCw,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';

export function DeviceOsSettingsCard() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isBm = language === 'bm';

  const [permState, setPermState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [checking, setChecking] = useState(false);
  const [testingLocal, setTestingLocal] = useState(false);
  const [showBatteryGuide, setShowBatteryGuide] = useState(false);

  const checkDevicePermissions = useCallback(async () => {
    setChecking(true);
    try {
      if (!Capacitor.isNativePlatform()) {
        if ('Notification' in window) {
          const webPerm = Notification.permission;
          if (webPerm === 'granted') setPermState('granted');
          else if (webPerm === 'denied') setPermState('denied');
          else setPermState('prompt');
        } else {
          setPermState('unknown');
        }
        return;
      }

      const status = await PushNotifications.checkPermissions();
      const stateVal = status.receive;
      if (stateVal === 'granted') {
        setPermState('granted');
      } else if (stateVal === 'denied') {
        setPermState('denied');
      } else {
        setPermState('prompt');
      }
    } catch (err) {
      console.warn('Error checking device notification permissions:', err);
      setPermState('unknown');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkDevicePermissions();

    const handleResume = () => {
      checkDevicePermissions();
    };

    window.addEventListener('wawasan_app_resumed', handleResume);
    return () => {
      window.removeEventListener('wawasan_app_resumed', handleResume);
    };
  }, [checkDevicePermissions]);

  const handleGrantPermission = async () => {
    await triggerMediumImpact();
    try {
      if (!Capacitor.isNativePlatform()) {
        if ('Notification' in window) {
          const res = await Notification.requestPermission();
          if (res === 'granted') setPermState('granted');
          else if (res === 'denied') setPermState('denied');
        }
        return;
      }

      const res = await PushNotifications.requestPermissions();
      if (res.receive === 'granted') {
        setPermState('granted');
        toast({
          title: isBm ? 'Kebenaran Diberikan' : 'Permission Granted',
          description: isBm ? 'Pemberitahuan push kini aktif pada peranti anda.' : 'Push notifications are now enabled on your device.',
          variant: 'success'
        });
      } else {
        setPermState('denied');
        toast({
          title: isBm ? 'Kebenaran Ditolak' : 'Permission Denied',
          description: isBm ? 'Sila buka Tetapan OS Peranti untuk mendayakan.' : 'Please open Device OS Settings to enable notifications.',
          variant: 'error'
        });
      }
    } catch (err) {
      console.error('Error requesting permissions:', err);
    }
  };

  const handleOpenOsSettings = async () => {
    await triggerMediumImpact();
    try {
      if (Capacitor.isNativePlatform()) {
        const appWithSettings = App as unknown as { openAppSettings?: () => Promise<void> };
        if (typeof appWithSettings.openAppSettings === 'function') {
          await appWithSettings.openAppSettings();
        } else {
          toast({
            title: isBm ? 'Tetapan OS Peranti' : 'Device OS Settings',
            description: isBm ? 'Buka Tetapan > Aplikasi > Wawasan Pak Usop > Kebenaran / Notifikasi' : 'Go to Settings > Apps > Wawasan Pak Usop > Permissions / Notifications',
            variant: 'success'
          });
        }
      } else {
        toast({
          title: isBm ? 'Laman Web Browser' : 'Web Environment',
          description: isBm ? 'Sila benarkan kebenaran dalam tetapan penyemak imbas anda.' : 'Please adjust site permissions in your browser settings.',
          variant: 'success'
        });
      }
    } catch (err) {
      console.warn('Could not open App Settings directly:', err);
      toast({
        title: isBm ? 'Tetapan OS Peranti' : 'Device OS Settings',
        description: isBm ? 'Buka Tetapan > Aplikasi > Wawasan Pak Usop > Kebenaran / Notifikasi' : 'Go to Settings > Apps > Wawasan Pak Usop > Permissions / Notifications',
        variant: 'success'
      });
    }
  };

  const handleTestLocalNotification = async () => {
    await triggerLightImpact();
    setTestingLocal(true);
    try {
      if (!Capacitor.isNativePlatform()) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(isBm ? '🔔 Ujian Notifikasi Wawasan' : '🔔 Wawasan Notification Test', {
            body: isBm ? 'Kebenaran notifikasi berfungsi dengan cemerlang!' : 'Notification permissions working perfectly!',
            icon: '/assets/brand/wawasan_logo.svg'
          });
          toast({
            title: isBm ? 'Notifikasi Dihantar' : 'Notification Dispatched',
            description: isBm ? 'Notifikasi ujian telah dipaparkan.' : 'Test notification sent.',
            variant: 'success'
          });
        } else {
          toast({
            title: isBm ? 'Perlu Kebenaran' : 'Permission Needed',
            description: isBm ? 'Sila benarkan notifikasi terlebih dahulu.' : 'Please allow notifications first.',
            variant: 'error'
          });
        }
        return;
      }

      let checkRes = await LocalNotifications.checkPermissions();
      if (checkRes.display !== 'granted') {
        checkRes = await LocalNotifications.requestPermissions();
      }

      if (checkRes.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: isBm ? '🔔 Ujian Peranti Wawasan Pak Usop' : '🔔 Wawasan Pak Usop Device Test',
              body: isBm ? 'Saluran notifikasi OS peranti anda berfungsi dengan sempurna!' : 'Your device OS notification channel is fully operational!',
              id: Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 500) },
              sound: 'default',
              channelId: 'order_status',
              actionTypeId: '',
              extra: null
            }
          ]
        });

        toast({
          title: isBm ? 'Ujian Dipicu' : 'Test Triggered',
          description: isBm ? 'Notifikasi peranti telah dihantar.' : 'Local test notification dispatched.',
          variant: 'success'
        });
      } else {
        toast({
          title: isBm ? 'Kebenaran Ditolak' : 'Permission Blocked',
          description: isBm ? 'Sila buka Tetapan OS untuk benarkan notifikasi.' : 'Please open OS Settings to enable notifications.',
          variant: 'error'
        });
      }
    } catch (err) {
      console.warn('Local notification test error:', err);
      toast({
        title: isBm ? 'Ujian Notifikasi' : 'Notification Test',
        description: err instanceof Error ? err.message : 'Failed to schedule local test notification.',
        variant: 'error'
      });
    } finally {
      setTestingLocal(false);
    }
  };

  return (
    <div className="bg-white dark:bg-card border border-stone-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-deep-forest dark:text-stone-100 flex items-center gap-2">
              {isBm ? 'Diagnostik Kebenaran OS Peranti' : 'Device OS Permission Diagnostics'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isBm ? 'Status kebenaran pemberitahuan sistem Android / iOS' : 'Status of Android / iOS system notification permissions'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {permState === 'granted' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isBm ? 'Dibenarkan' : 'Granted'}
            </span>
          )}
          {permState === 'prompt' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              {isBm ? 'Belum Diberi' : 'Needs Action'}
            </span>
          )}
          {permState === 'denied' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              {isBm ? 'Dihalang di OS' : 'Blocked in OS'}
            </span>
          )}
          {(checking || permState === 'unknown') && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              {isBm ? 'Menyemak' : 'Checking'}
            </span>
          )}
        </div>
      </div>

      {/* Warning Box if Denied */}
      {permState === 'denied' && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {isBm 
                ? 'Pemberitahuan Dihalang dalam Tetapan Peranti' 
                : 'Notifications Blocked in Device Settings'}
            </span>
          </div>
          <p className="text-rose-700 dark:text-rose-300/90 leading-relaxed">
            {isBm
              ? 'Sistem OS peranti anda telah menyekat notifikasi. Sila buka tetapan OS peranti untuk membolehkan semula pemberitahuan status tempahan.'
              : 'Your device OS settings currently block notifications. Open OS settings to enable order status notifications.'}
          </p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {permState === 'prompt' && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleGrantPermission}
            className="h-9 px-3.5 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-2xs flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isBm ? 'Benarkan Notifikasi' : 'Grant Permission'}</span>
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenOsSettings}
          className="h-9 px-3.5 text-xs font-semibold rounded-xl border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-1.5 shadow-2xs"
        >
          <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
          <span>{isBm ? 'Buka Tetapan OS' : 'Open OS Settings'}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleTestLocalNotification}
          disabled={testingLocal}
          className="h-9 px-3.5 text-xs font-semibold rounded-xl text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 flex items-center gap-1.5"
        >
          <Bell className="w-3.5 h-3.5 text-purple-600" />
          <span>{testingLocal ? (isBm ? 'Menguji...' : 'Testing...') : (isBm ? 'Uji Notifikasi Peranti' : 'Test Device Notification')}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowBatteryGuide(!showBatteryGuide)}
          className="h-9 px-3.5 text-xs font-semibold rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 ml-auto"
        >
          <BatteryCharging className="w-3.5 h-3.5 text-amber-500" />
          <span>{isBm ? 'Optimasi Bateri' : 'Battery Saver Info'}</span>
        </Button>
      </div>

      {/* Battery Saver Guidance Accordion */}
      {showBatteryGuide && (
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2 mt-2">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
            <Zap className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{isBm ? 'Panduan Optimasi Bateri Android' : 'Android Battery Saver Guidance'}</span>
          </div>
          <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
            {isBm
              ? 'Pengeluar peranti (Samsung, Xiaomi, Oppo, Vivo) mungkin menangguhkan notifikasi latar belakang jika Penjimatan Bateri ditetapkan kepada "Optimised" atau "Restricted".'
              : 'Device manufacturers (Samsung, Xiaomi, Oppo, Vivo) may defer background notifications if Battery Saver is set to "Optimized" or "Restricted".'}
          </p>
          <ul className="list-disc pl-4 space-y-1 text-stone-600 dark:text-stone-400">
            <li>
              {isBm
                ? 'Tetapkan Penggunaan Bateri Aplikasi kepada "Tidak Dihadkan" (Unrestricted).'
                : 'Set App Battery Usage to "Unrestricted" in Android App Info.'}
            </li>
            <li>
              {isBm
                ? 'Pastikan Notifikasi Saluran "Kemas Kini Tempahan" aktif di skrin kunci.'
                : 'Ensure "Order Updates" notification channel is enabled on lockscreen.'}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
