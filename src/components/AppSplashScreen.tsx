import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';

interface AppSplashScreenProps {
  isLoading: boolean;
}

const AppSplashScreen: React.FC<AppSplashScreenProps> = ({ isLoading }) => {
  const [show, setShow] = useState(true);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShow(false);
      }, 500); // Smooth delay before fading out for polished finish
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-between py-12 px-6 bg-cream dark:bg-stone-950 text-charcoal dark:text-stone-100 select-none touch-none overflow-hidden"
        >
          {/* Subtle ambient lighting backdrop */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.25, 0.4, 0.25],
                scale: [0.95, 1.1, 0.95],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] md:w-[500px] md:h-[500px] rounded-full bg-[var(--color-sunshine-cta)]/20 dark:bg-amber-500/10 blur-3xl"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.03)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
          </div>

          <div />

          {/* Center Brand Identity */}
          <div className="relative flex flex-col items-center z-10 max-w-sm w-full">
            {/* Glowing Brand Ring */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center"
            >
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute w-36 h-36 md:w-44 md:h-44 rounded-full border border-dashed border-[var(--color-sunshine-cta)]/40 dark:border-amber-400/20"
              />

              <div className="relative z-10 p-4 rounded-3xl bg-white/40 dark:bg-stone-900/40 backdrop-blur-md shadow-xl ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center">
                {logoError ? (
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-sunshine to-amber-600 flex items-center justify-center shadow-inner">
                    <span className="text-white font-display font-black text-4xl tracking-tight">RW</span>
                  </div>
                ) : (
                  <img
                    src={getAssetUrl('/assets/wawasan_logo.svg')}
                    alt="Restoran Wawasan Logo"
                    className="w-24 h-24 md:w-32 md:h-32 object-contain filter drop-shadow-lg"
                    onError={() => {
                      // Fallback to PNG or logo text error state
                      setLogoError(true);
                    }}
                  />
                )}
              </div>
            </motion.div>

            {/* Typography */}
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-col items-center text-center space-y-2"
            >
              <h1 className="text-2xl md:text-3xl font-black text-charcoal dark:text-stone-50 tracking-tight uppercase">
                Restoran <span className="text-[var(--color-sunshine-cta)]">Wawasan</span>
              </h1>
              <p className="text-xs md:text-sm font-medium text-charcoal/70 dark:text-stone-400 tracking-wide">
                Hidangan Warisan & Katering Terbaik
              </p>
            </motion.div>

            {/* Elegant Loading Bar Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-8 w-44 h-1 bg-cream-dark dark:bg-stone-800 rounded-full overflow-hidden relative shadow-inner"
            >
              <motion.div
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-sunshine/80 via-sunshine to-amber-600 dark:from-amber-500 dark:via-amber-400 dark:to-amber-500 rounded-full shadow-sm"
              />
            </motion.div>
          </div>

          {/* Footer Badge */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="microcopy-12-upper font-semibold text-charcoal/50 dark:text-stone-400 uppercase tracking-[0.25em] z-10"
          >
            EST. 1986 • PUTRAJAYA
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppSplashScreen;
