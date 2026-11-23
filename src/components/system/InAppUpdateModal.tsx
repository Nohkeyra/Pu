import { useCallback, useEffect, useRef, useState } from 'react';
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
import { AppLauncher } from '@capacitor/app-launcher';
import { useOverlayAccessibility } from '@/hooks/ui/useOverlayAccessibility';
import type { AppVersionConfig } from '@/services/updateService';
import { CURRENT_APP_VERSION, DEFAULT_APK_URL, downloadAndApplyCapgoOta } from '@/services/updateService';

interface InAppUpdateModalProps {
  isOpen: boolean;
  config: AppVersionConfig | null;
  currentVersion?: string;
  isForceUpdate: boolean;
  onDismiss: () => void;
}

function getSafeApkUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return DEFAULT_APK_URL;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // Malformed URL fallback
  }
  return DEFAULT_APK_URL;
}

export default function InAppUpdateModal({
  isOpen,
  config,
  currentVersion,
  isForceUpdate,
  onDismiss,
}: InAppUpdateModalProps) {
  const { language } = useLanguage();
  const [phase, setPhase] = useState<'idle' | 'ota' | 'opening' | 'opened' | 'applied' | 'error'>('idle');
  const modalRef = useRef<HTMLDivElement>(null);
  const session = useRef({ active: false });
  const busy = useRef(false);
  const dismiss = useRef({ onDismiss, isForceUpdate });
  useEffect(() => { dismiss.current = { onDismiss, isForceUpdate }; }, [onDismiss, isForceUpdate]);
  const requestDismiss = useCallback(() => {
    if (!busy.current && !dismiss.current.isForceUpdate) dismiss.current.onDismiss();
  }, []);
  useOverlayAccessibility({ isOpen: isOpen && Boolean(config), onClose: requestDismiss, containerRef: modalRef });

  useEffect(() => {
    const current = { active: isOpen };
    session.current = current;
    busy.current = false;
    setPhase('idle');
    return () => { current.active = false; };
  }, [isOpen, config?.latestVersion]);

  if (!isOpen || !config) return null;

  const displayCurrentVersion = currentVersion || CURRENT_APP_VERSION;
  const isBM = language === 'bm';
  const apkUrl = getSafeApkUrl(config.apkUrl);
  const hasCapgoBundle = Capacitor.isNativePlatform() && Boolean(config.bundleUrl?.trim());
  const downloading = phase === 'ota' || phase === 'opening';

  const handleStartUpdate = async () => {
    const operation = session.current;
    if (busy.current || !operation.active) return;
    busy.current = true;
    void triggerMediumImpact();
    setPhase(hasCapgoBundle ? 'ota' : 'opening');
    try {
      if (hasCapgoBundle) {
        const success = await downloadAndApplyCapgoOta(config.bundleUrl!, config.latestVersion);
        if (!operation.active) return;
        if (success) { setPhase('applied'); return; }
        setPhase('opening');
      }

      if (Capacitor.isNativePlatform()) {
        const result = await AppLauncher.openUrl({ url: apkUrl });
        if (!result.completed) throw new Error('No application opened the APK link');
      } else {
        // Preserve the browser's user gesture. Opening an APK is not a web reload
        // and does not provide byte progress or confirm installation.
        const link = document.createElement('a');
        link.href = apkUrl;
        link.download = 'Wawasan.Hub.apk';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      if (operation.active) setPhase('opened');
    } catch {
      if (operation.active) setPhase('error');
    } finally {
      if (operation.active) busy.current = false;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-update-title"
          tabIndex={-1}
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
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={async () => {
                await triggerLightImpact();
                onDismiss();
              }}
              className="absolute top-4 right-4 h-9 w-9 rounded-full text-stone hover:text-deep-forest dark:hover:text-white hover:bg-stone/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </Button>
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
              <span className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block ${isForceUpdate ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-[var(--color-sunshine-cta)]/20 text-[var(--color-sunshine-cta)]'}`}>
                {isForceUpdate 
                  ? (isBM ? 'Kemaskini Penting Diperlukan' : 'Critical Update Required') 
                  : (isBM ? 'Kemaskini Terus Aplikasi' : 'Live In-App Update')}
              </span>
              <h2 id="app-update-title" className="text-xl font-display font-bold text-deep-forest dark:text-white mt-0.5">
                {isBM ? 'Versi Baru Tersedia!' : 'New Version Available!'}
              </h2>
            </div>
          </div>

          {/* Version Pill Badges */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cream/70 dark:bg-stone/10 border border-border/60 text-xs font-semibold">
            <div className="space-y-0.5">
              <span className="text-stone dark:text-stone/70 block text-xs uppercase tracking-wider">
                {isBM ? 'Versi Semasa' : 'Current Version'}
              </span>
              <span className="text-stone dark:text-stone/80 font-mono text-sm">
                v{displayCurrentVersion}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-[var(--color-sunshine-cta)]" />

            <div className="space-y-0.5 text-right">
              <span className="text-stone dark:text-stone/70 block text-xs uppercase tracking-wider">
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

          {/* Native OTA has no byte-progress callback here. Show the actual
              operation, never a fabricated percentage or installation claim. */}
          {phase !== 'idle' && (
            <p role={phase === 'error' ? 'alert' : 'status'} aria-live="polite" className="text-sm text-deep-forest dark:text-white">
              {phase === 'ota' ? (isBM ? 'Memuat turun dan menerapkan kemas kini…' : 'Downloading and applying update…')
                : phase === 'opening' ? (isBM ? 'Membuka pautan muat turun…' : 'Opening download link…')
                : phase === 'opened' ? (isBM ? 'Pautan APK telah dibuka. Selesaikan muat turun dan pemasangan melalui peranti anda.' : 'APK link opened. Complete the download and installation on your device.')
                : phase === 'applied' ? (isBM ? 'Pakej kemas kini sedia digunakan.' : 'Update package is ready.')
                : (isBM ? 'Tidak dapat membuka kemas kini. Sila cuba lagi.' : 'Could not open the update. Please try again.')}
            </p>
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
                  {phase === 'ota' ? (isBM ? 'Menerapkan kemas kini…' : 'Applying update…') : (isBM ? 'Membuka muat turun…' : 'Opening download…')}
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
              <p className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium">
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
