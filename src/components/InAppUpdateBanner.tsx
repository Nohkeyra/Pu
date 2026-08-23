import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { triggerLightImpact } from '@/lib/haptics';
import type { AppVersionConfig } from '@/services/updateService';

interface InAppUpdateBannerProps {
  visible: boolean;
  config: AppVersionConfig | null;
  onOpenModal: () => void;
  onDismiss: () => void;
}

export default function InAppUpdateBanner({
  visible,
  config,
  onOpenModal,
  onDismiss,
}: InAppUpdateBannerProps) {
  const { language } = useLanguage();
  if (!visible || !config) return null;

  const isBM = language === 'bm';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed top-[calc(var(--sat)+12px)] left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-[1900] pointer-events-auto"
      >
        <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-deep-forest/95 dark:bg-stone-900/95 text-white shadow-2xl border border-amber-500/30 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[var(--color-sunshine-cta)]/20 text-[var(--color-sunshine-cta)] shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-sunshine-cta)]">
                  {isBM ? 'Kemaskini Tersedia' : 'Update Ready'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                  v{config.latestVersion}
                </span>
              </div>
              <p className="text-xs font-semibold text-stone-200 truncate">
                {isBM
                  ? 'Versi baru sedia dipasang (Kemaskini Terus)'
                  : 'New version ready to install'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                await triggerLightImpact();
                onOpenModal();
              }}
              className="bg-[var(--color-sunshine-cta)] hover:bg-[var(--color-sunshine-cta)]/90 text-deep-forest font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1 shadow"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isBM ? 'Pasang' : 'Install'}</span>
              <ArrowRight className="w-3 h-3" />
            </Button>

            <button
              type="button"
              onClick={async () => {
                await triggerLightImpact();
                onDismiss();
              }}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
