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
      className="fixed inset-0 z-[9999] flex min-h-[100dvh] flex-col items-center overflow-hidden bg-[#fff6e4] text-[#173b2a] dark:bg-[#191612] dark:text-[#fff6e2]"
      initial={false}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      aria-label={bm ? 'Skrin pembukaan Restoran Wawasan' : 'Restoran Wawasan opening screen'}
    >
      <style>{`@font-face{font-family:'WawasanWelcome';src:url('${getAssetUrl('/assets/fonts/Pacifico-Regular.ttf')}') format('truetype');font-display:swap}
        @keyframes splash-foliage-sway{0%,100%{transform:rotate(0deg)}35%{transform:rotate(.8deg)}70%{transform:rotate(-.55deg)}}
        @keyframes splash-flower-sway{0%,100%{transform:rotate(0deg)}35%{transform:rotate(-.65deg)}70%{transform:rotate(.5deg)}}
        .splash-foliage{transform-box:view-box;transform-origin:0 0;animation:splash-foliage-sway 3.2s ease-in-out infinite}
        .splash-flower{transform-box:view-box;transform-origin:100% 100%;animation:splash-flower-sway 3.4s ease-in-out infinite}
        @media(prefers-reduced-motion:reduce){.splash-foliage,.splash-flower{animation:none}}
      `}</style>
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 720 1280" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="splash-cut-fade"><stop offset="65%" stopColor="black" /><stop offset="100%" stopColor="white" /></radialGradient>
          <radialGradient id="splash-part-fade"><stop offset="65%" stopColor="white" /><stop offset="100%" stopColor="black" /></radialGradient>
          <mask id="splash-static-background" maskUnits="userSpaceOnUse">
            <rect width="720" height="1280" fill="white" />
            <ellipse cx="0" cy="0" rx="270" ry="245" fill="url(#splash-cut-fade)" />
            <ellipse cx="720" cy="1280" rx="265" ry="260" fill="url(#splash-cut-fade)" />
          </mask>
          <mask id="splash-top-foliage" maskUnits="userSpaceOnUse"><rect width="720" height="1280" fill="black" /><ellipse cx="0" cy="0" rx="270" ry="245" fill="url(#splash-part-fade)" /></mask>
          <mask id="splash-bottom-flower" maskUnits="userSpaceOnUse"><rect width="720" height="1280" fill="black" /><ellipse cx="720" cy="1280" rx="265" ry="260" fill="url(#splash-part-fade)" /></mask>
        </defs>
        <image href={getAssetUrl('/assets/illustrations/splash-wawasan-light.webp')} width="720" height="1280" mask="url(#splash-static-background)" className="dark:hidden" />
        <image href={getAssetUrl('/assets/illustrations/splash-wawasan-dark.webp')} width="720" height="1280" mask="url(#splash-static-background)" className="hidden dark:block" />
        <g className="splash-foliage">
          <image href={getAssetUrl('/assets/illustrations/splash-wawasan-light.webp')} width="720" height="1280" mask="url(#splash-top-foliage)" className="dark:hidden" />
          <image href={getAssetUrl('/assets/illustrations/splash-wawasan-dark.webp')} width="720" height="1280" mask="url(#splash-top-foliage)" className="hidden dark:block" />
        </g>
        <g className="splash-flower">
          <image href={getAssetUrl('/assets/illustrations/splash-wawasan-light.webp')} width="720" height="1280" mask="url(#splash-bottom-flower)" className="dark:hidden" />
          <image href={getAssetUrl('/assets/illustrations/splash-wawasan-dark.webp')} width="720" height="1280" mask="url(#splash-bottom-flower)" className="hidden dark:block" />
        </g>
      </svg>

      <button
        type="button"
        onClick={complete}
        className="absolute right-4 z-20 flex min-h-11 items-center rounded-full border border-[#a55a1d]/25 bg-[#fffaf0]/80 px-4 text-xs font-semibold text-[#61330f] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:border-amber-200/25 dark:bg-black/25 dark:text-amber-100 dark:hover:bg-black/40"
        style={{ top: 'calc(0.75rem + var(--safe-area-inset-top, 0px))' }}
      >
        {bm ? 'Langkau' : 'Skip'}
      </button>

      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 pt-16 text-center sm:gap-5" style={{ paddingTop: 'calc(4rem + var(--safe-area-inset-top, 0px))', paddingBottom: 'calc(4rem + var(--safe-area-inset-bottom, 0px))' }}>
        <motion.img
          src={getAssetUrl('/assets/brand/wawasan_logo_badge.png')}
          alt="Restoran Wawasan"
          width={512}
          height={512}
          initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="h-auto max-h-[32dvh] w-[min(70vw,260px)] shrink-0 object-contain"
          draggable={false}
        />

        <div className="space-y-1">
          <h1 aria-label={bm ? 'Selamat datang!' : 'Welcome!'} className="text-2xl leading-snug text-[#173b2a] dark:text-[#fff6e2] sm:text-3xl" style={{ fontFamily: "'WawasanWelcome', cursive" }}>
            <motion.span aria-hidden="true" className="inline-block" initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : 1.3, ease: [0.22, 1, 0.36, 1] }}>
              {bm ? 'Selamat' : 'Welcome'}
            </motion.span>
            <motion.span aria-hidden="true" className="inline-block whitespace-pre" initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : 1.46, ease: [0.22, 1, 0.36, 1] }}>
              {bm ? ' datang!' : '!'}
            </motion.span>
          </h1>
          <svg aria-hidden="true" viewBox="0 0 180 12" className="mx-auto block h-2 w-36 text-[#df710f] dark:text-[#ffa42c]">
            <motion.path d="M 3 9 Q 90 -3 177 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.48, delay: reduceMotion ? 0 : 1.68, ease: 'easeOut' }} />
          </svg>
          <motion.p className="text-sm font-medium text-[#704b30] dark:text-amber-100/80" initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 1.85 }}>
            {bm ? 'Dari Wawasan, dengan rasa.' : 'From Wawasan, with flavour.'}
          </motion.p>
        </div>
      </div>

      <div role="status" aria-live="polite" className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-2 pb-5 text-xs font-semibold text-[#704b30] dark:text-amber-100/80" style={{ paddingBottom: 'calc(1.25rem + var(--safe-area-inset-bottom, 0px))' }}>
        <span className="rounded-full bg-[#fff6e4]/90 px-3 py-1 dark:bg-[#191612]/90">{isLoading ? (bm ? 'Menyediakan aplikasi…' : 'Preparing the app…') : (bm ? 'Sedia' : 'Ready')}</span>
        <span aria-hidden="true" className="h-1 w-20 overflow-hidden rounded-full bg-[#aa6b36]/20 dark:bg-white/15">
          <motion.span className="block h-full w-1/2 rounded-full bg-[#d66b0c] dark:bg-amber-300" animate={reduceMotion ? { opacity: 1 } : { x: ['-100%', '200%'] }} transition={reduceMotion ? { duration: 0 } : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
        </span>
      </div>
    </motion.div>
  );
}
