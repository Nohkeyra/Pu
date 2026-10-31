import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

export interface SplashScreenProps {
  isLoading: boolean;
  onComplete?: () => void;
}

const SPLASH_DURATION_MS = 3400;
const FAILSAFE_MS = 6000;

export default function SplashScreen({ isLoading, onComplete }: SplashScreenProps) {
  const { language } = useLanguage();
  const reduceMotion = Boolean(useReducedMotion());
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const completed = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const complete = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    const minimumTimer = window.setTimeout(() => setMinimumElapsed(true), reduceMotion ? 300 : SPLASH_DURATION_MS);
    const fallbackTimer = window.setTimeout(complete, FAILSAFE_MS);
    return () => {
      window.clearTimeout(minimumTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [complete, reduceMotion]);

  useEffect(() => {
    if (!minimumElapsed || isLoading) {
      setExiting(false);
      return;
    }
    setExiting(true);
    const exitTimer = window.setTimeout(complete, reduceMotion ? 0 : 250);
    return () => window.clearTimeout(exitTimer);
  }, [complete, minimumElapsed, isLoading, reduceMotion]);

  const bm = language === 'bm';

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex min-h-[100dvh] flex-col items-center overflow-hidden bg-[#102b22] text-white"
      initial={false}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      aria-label={bm ? 'Skrin pembukaan Restoran Wawasan' : 'Restoran Wawasan opening screen'}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_36%,rgba(244,183,62,0.16),transparent_55%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: `url(${getAssetUrl('/assets/heritage/batik_pattern.jpg')})`, backgroundSize: '320px auto' }} />
      {!reduceMotion && (
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.55, 0.3, 0] }} transition={{ duration: 1.6, times: [0, 0.25, 0.7, 1] }}>
          {[12, 23, 35, 48, 61, 73, 85].map((top, index) => (
            <motion.span key={top} className="absolute h-px bg-gradient-to-r from-transparent via-amber-100/70 to-transparent" style={{ top: `${top}%`, width: `${45 + (index % 3) * 15}%`, right: '-60%', transform: 'rotate(-12deg)' }} animate={{ x: [0, '-300vw'] }} transition={{ duration: 0.6 + (index % 3) * 0.12, delay: 0.12 + index * 0.045, ease: 'easeIn' }} />
          ))}
        </motion.div>
      )}

      <button
        type="button"
        onClick={complete}
        className="absolute right-4 z-20 flex min-h-11 items-center rounded-full border border-white/25 bg-black/20 px-4 text-xs font-semibold text-white transition-colors hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        style={{ top: 'calc(0.75rem + var(--safe-area-inset-top, 0px))' }}
      >
        {bm ? 'Langkau' : 'Skip'}
      </button>

      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 px-6 pb-16 pt-16 text-center sm:gap-5" style={{ paddingTop: 'calc(4rem + var(--safe-area-inset-top, 0px))', paddingBottom: 'calc(4rem + var(--safe-area-inset-bottom, 0px))' }}>
        <motion.img
          src={getAssetUrl('/assets/brand/wawasan_logo_badge.png')}
          alt="Restoran Wawasan"
          width={512}
          height={512}
          initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 1.25, ease: [0.22, 1, 0.36, 1] }}
          className="h-auto w-[min(44vw,170px)] shrink-0 object-contain"
          draggable={false}
        />

        <div className="relative flex h-[min(37dvh,250px)] w-full items-center justify-center">
          <motion.div aria-hidden="true" className="absolute aspect-square h-[86%] rounded-full border border-amber-200/30 bg-[#f8efd9] shadow-[0_12px_50px_rgba(0,0,0,0.18)]" initial={reduceMotion ? false : { scale: 0.55, opacity: 0 }} animate={reduceMotion ? { scale: 1, opacity: 1 } : { scale: [0.55, 1.1, 1], opacity: [0, 1, 1] }} transition={{ duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : 0.6, times: [0, 0.65, 1] }} />
          {!reduceMotion && <motion.div aria-hidden="true" className="absolute aspect-square h-[86%] rounded-full border-2 border-amber-200/80" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: [0.7, 1.35], opacity: [0, 0.65, 0] }} transition={{ duration: 0.7, delay: 0.85, times: [0, 0.2, 1] }} />}
          <motion.img
            src={getAssetUrl('/assets/mascots/daun_rider.webp')}
            alt={bm ? 'Maskot Daun Wawasan menunggang motor dengan beg GrabFood' : 'Daun Wawasan mascot riding a motorcycle with a GrabFood bag'}
            width={900}
            height={822}
            initial={reduceMotion ? false : { opacity: 0, x: '110%', y: 35, rotate: -12, scale: 1.25 }}
            animate={reduceMotion ? { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 } : { opacity: [0, 1, 1, 1, 1], x: ['110%', '18%', '-5%', '2%', '0%'], y: [35, -8, 3, -3, 0], rotate: [-12, -6, 3, -1, 0], scale: [1.25, 1.08, 1.02, 1, 1] }}
            transition={{ duration: reduceMotion ? 0 : 1.35, times: [0, 0.4, 0.65, 0.8, 1], ease: 'easeOut' }}
            className="relative h-full w-full object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.18)]"
            draggable={false}
          />
        </div>

        <motion.div className="space-y-1.5" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : 1.45 }}>
          <h1 className="font-display text-xl font-bold tracking-tight text-[#fff6e2] sm:text-2xl">
            {bm ? 'Selamat datang!' : 'Welcome!'}
          </h1>
          <p className="text-sm font-medium text-amber-100/80">
            {bm ? 'Dari Wawasan, dengan rasa.' : 'From Wawasan, with flavour.'}
          </p>
        </motion.div>
      </div>

      <div role="status" aria-live="polite" className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-2 pb-5 text-xs font-semibold text-amber-100/80" style={{ paddingBottom: 'calc(1.25rem + var(--safe-area-inset-bottom, 0px))' }}>
        <span>{isLoading ? (bm ? 'Menyediakan aplikasi…' : 'Preparing the app…') : (bm ? 'Sedia' : 'Ready')}</span>
        <span aria-hidden="true" className="h-1 w-20 overflow-hidden rounded-full bg-white/15">
          <motion.span className="block h-full w-1/2 rounded-full bg-amber-300" animate={reduceMotion ? { opacity: 1 } : { x: ['-100%', '200%'] }} transition={reduceMotion ? { duration: 0 } : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
        </span>
      </div>
    </motion.div>
  );
}
