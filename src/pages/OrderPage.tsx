import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import OrderForm from '@/components/OrderForm';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getAssetUrl } from '@/lib/utils';
import { Batik3DMotion } from '@/components/Batik3DMotion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { motion } from 'motion/react';
import PageShell from '@/components/PageShell';

export default function OrderPage() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const initialData = location.state?.reorderData;

  const [refreshKey, setRefreshKey] = useState(0);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      setRefreshKey(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 800));
    },
  });

  return (
    <ErrorBoundary>
      <PageShell
        title={t('nav_order') || 'Tempahan'}
        subtitle={language === 'bm' ? 'Borang Tempahan Katering' : 'Catering Order Form'}
        backHref="/home"
      >
        {/* Pull to Refresh Indicator */}
        <motion.div
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none pt-[calc(var(--sat)+1rem)]"
          animate={{
            y: isRefreshing ? 20 : Math.max(0, Math.min(pullDistance - 40, 20)),
            opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
            scale: pullDistance > 10 || isRefreshing ? 1 : 0.8,
          }}
        >
          <div className="bg-white dark:bg-card shadow-premium rounded-full p-2.5 border border-[var(--color-sunshine-cta)]/20 flex items-center gap-2">
            <RefreshCw
              className={`w-4 h-4 text-[var(--color-sunshine-cta)] ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 2}deg)` }}
            />
            {isRefreshing && (
              <span className="microcopy-12-upper text-[var(--color-sunshine-cta)]">
                Refreshing
              </span>
            )}
          </div>
        </motion.div>

        <motion.div
          key={refreshKey}
          className="py-4 sm:py-6 pb-[calc(100px+env(safe-area-inset-bottom,16px))] relative w-full"
          animate={{ y: isRefreshing ? 60 : pullDistance * 0.5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        >
          <OrderForm initialData={initialData} />
        </motion.div>

        <footer className="bg-deep-forest dark:bg-card border-t border-amber-500/20 pt-10 pb-[calc(110px+env(safe-area-inset-bottom,16px))] mt-14 relative overflow-hidden">
          {/* Cinematic Deep Dark Batik Background Layer (Matching HeroSection) */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-deep-forest dark:bg-card pointer-events-none">
            {/* Dynamic Atmospheric Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-deep-forest/90 via-deep-forest/65 to-deep-forest dark:from-card/95 dark:via-card/75 dark:to-card z-0" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0c453c]/35 via-transparent to-amber-950/20 dark:from-[#101915]/60 dark:to-transparent z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(10,28,24,0.6)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(12,16,14,0.8)_100%)] z-0" />

            {/* Traditional Malaysian Batik Vector Pattern Background Layer */}
            <Batik3DMotion
              mode="img"
              src={getAssetUrl('/assets/heritage/batik_vector_pattern.jpg')}
              maxRotation={12}
              imgClassName="opacity-35 sm:opacity-50 dark:opacity-28 dark:sm:opacity-38 contrast-[1.12] saturate-[1.18] dark:brightness-105 transition-opacity duration-700 pointer-events-none"
            />

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 pattern-dots opacity-10 [mask-image:radial-gradient(circle_at_center,black_30%,transparent_90%)] pointer-events-none z-10" />
          </div>

          <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-sunshine-cta)] shadow-[0_0_8px_rgba(246,153,19,0.8)]" />
              <span className="text-white text-xs tracking-[0.18em] uppercase font-semibold">
                Restoran Wawasan Pak Usop
              </span>
            </div>
            <p className="text-amber-100/70 dark:text-stone-400 text-xs sm:text-sm">© 2026 All rights reserved</p>
          </div>
        </footer>
      </PageShell>
    </ErrorBoundary>
  );
}
