import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Sparkles, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import type { AppVersionConfig } from '@/services/updateService';
import { CURRENT_APP_VERSION, downloadAndApplyCapgoOta } from '@/services/updateService';

interface InAppUpdateModalProps {
  isOpen: boolean;
  config: AppVersionConfig | null;
  isForceUpdate: boolean;
  onDismiss: () => void;
}

export default function InAppUpdateModal({
  isOpen,
  config,
  isForceUpdate,
  onDismiss,
}: InAppUpdateModalProps) {
  const { language } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  if (!isOpen || !config) return null;

  const isBM = language === 'bm';
  const apkUrl = config.apkUrl || 'https://github.com/Nohkeyra/Pu/releases/download/v7.0/Wawasan.Hub.apk';
  const hasCapgoBundle = Boolean(config.bundleUrl && config.bundleUrl.trim().length > 0);

  const handleStartUpdate = async () => {
    await triggerMediumImpact();
    setDownloading(true);
    setDownloadProgress(10);

    // If native device and Capgo live update zip bundle URL exists
    if (Capacitor.isNativePlatform() && hasCapgoBundle) {
      setDownloadProgress(35);
      const success = await downloadAndApplyCapgoOta(config.bundleUrl!, config.latestVersion);
      if (success) {
        setDownloadProgress(100);
        setDownloading(false);
        return;
      }
    }

    // Fallback: Direct APK download or web reload
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 20) + 10;
      });
    }, 250);

    setTimeout(() => {
      clearInterval(interval);
      setDownloadProgress(100);

      setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          // Open direct APK download in native browser or package installer
          window.open(apkUrl, '_system');
        } else {
          // On Web: trigger APK download or reload
          const link = document.createElement('a');
          link.href = apkUrl;
          link.download = 'Wawasan.Hub.apk';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          if (location.protocol.startsWith('http')) {
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        }
        setDownloading(false);
      }, 600);
    }, 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-card border border-border shadow-2xl p-6 sm:p-7 text-left space-y-5"
        >
          {/* Subtle Batik background overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pattern-batik" />

          {/* Dismiss button if non-mandatory */}
          {!isForceUpdate && !downloading && (
            <button
              type="button"
              onClick={async () => {
                await triggerLightImpact();
                onDismiss();
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-stone hover:text-deep-forest dark:hover:text-white hover:bg-stone/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Header Icon & Tag */}
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isForceUpdate ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'bg-[var(--color-sunshine-cta)]/15 text-[var(--color-sunshine-cta)] border border-[var(--color-sunshine-cta)]/20'}`}>
              {isForceUpdate ? (
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              ) : (
                <Sparkles className="w-6 h-6" />
              )}
            </div>
            <div>
              <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block ${isForceUpdate ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-[var(--color-sunshine-cta)]/20 text-[var(--color-sunshine-cta)]'}`}>
                {isForceUpdate 
                  ? (isBM ? 'Kemaskini Penting Diperlukan' : 'Critical Update Required') 
                  : (isBM ? 'Kemaskini Terus Aplikasi' : 'Live In-App Update')}
              </span>
              <h2 className="text-xl font-display font-bold text-deep-forest dark:text-white mt-0.5">
                {isBM ? 'Versi Baru Tersedia!' : 'New Version Available!'}
              </h2>
            </div>
          </div>

          {/* Version Pill Badges */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cream/70 dark:bg-stone/10 border border-border/60 text-xs font-semibold">
            <div className="space-y-0.5">
              <span className="text-stone dark:text-stone/70 block text-[10px] uppercase tracking-wider">
                {isBM ? 'Versi Semasa' : 'Current Version'}
              </span>
              <span className="text-stone dark:text-stone/80 font-mono text-sm">
                v{CURRENT_APP_VERSION}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-[var(--color-sunshine-cta)]" />

            <div className="space-y-0.5 text-right">
              <span className="text-stone dark:text-stone/70 block text-[10px] uppercase tracking-wider">
                {isBM ? 'Versi Terkini' : 'Latest Version'}
              </span>
              <span className="text-[var(--color-sunshine-cta)] font-mono text-sm font-bold">
                v{config.latestVersion}
              </span>
            </div>
          </div>

          {/* Release Notes */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-deep-forest dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
              {isBM ? 'Perubahan & Penambahbaikan:' : 'What\'s New in this Release:'}
            </span>
            <ul className="space-y-2 text-xs text-stone dark:text-stone/80 leading-relaxed max-h-36 overflow-y-auto pr-1">
              {(config.releaseNotes || []).map((note, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Download Progress Bar when active */}
          {downloading && (
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs font-semibold text-deep-forest dark:text-white">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--color-sunshine-cta)]" />
                  {isBM ? 'Menyediakan Muat Turun APK...' : 'Preparing Live Package Download...'}
                </span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-stone/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--color-sunshine)] to-[var(--color-sunshine-cta)] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${downloadProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <Button
              type="button"
              disabled={downloading}
              onClick={handleStartUpdate}
              className="btn-cta w-full min-h-[48px] rounded-2xl font-bold flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {downloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {isBM ? 'Memuat Turun & Menerapkan OTA...' : 'Applying Live OTA Update...'}
                </>
              ) : hasCapgoBundle ? (
                <>
                  <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
                  {isBM ? 'Kemaskini Terus Selekas-Lekasnya (Capgo OTA)' : 'Instant Live Update (Capgo OTA)'}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {isBM ? 'Kemaskini Sekarang (Muat Turun APK)' : 'Update Now (Download APK)'}
                </>
              )}
            </Button>

            {!isForceUpdate && !downloading && (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  await triggerLightImpact();
                  onDismiss();
                }}
                className="w-full text-xs font-semibold text-stone hover:text-deep-forest dark:hover:text-white min-h-[40px] rounded-xl"
              >
                {isBM ? 'Ingatkan Saya Nanti' : 'Remind Me Later'}
              </Button>
            )}

            {isForceUpdate && (
              <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 font-medium">
                {isBM
                  ? 'Kemaskini ini adalah wajib untuk memastikan kelancaran aplikasi.'
                  : 'This critical update is mandatory to ensure application functionality.'}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
