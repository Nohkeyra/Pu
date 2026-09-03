import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAssetUrl, cn } from '@/lib/utils';
import { triggerDramaticImpact } from '@/lib/haptics';

// F-SPLASH: Animated delivery rider splash screen with Kunyit Gold Dark Mode & Putrajaya Sticker.

export interface SplashScreenProps {
  isLoading: boolean;
  onComplete?: () => void;
}

type Stage = 'ride' | 'impact' | 'slide' | 'hold' | 'logoZoom' | 'exit';

// F-CRACK: High-performance vector shatter & spiderweb fracture geometry for glass impact
const CRACK_MAIN: string[] = [
  'M200,200 L215,135 L195,75 L205,15',
  'M200,200 L260,160 L310,135 L360,100',
  'M200,200 L275,205 L340,195 L395,205',
  'M200,200 L255,250 L300,310 L345,360',
  'M200,200 L210,265 L190,330 L200,390',
  'M200,200 L145,255 L95,300 L45,345',
  'M200,200 L130,195 L60,205 L5,195',
  'M200,200 L145,145 L100,95 L50,45',
];

const CRACK_BRANCHES: string[] = [
  'M215,135 L255,115 L275,80',
  'M260,160 L285,200 L320,225',
  'M275,205 L290,245 L285,285',
  'M255,250 L220,275 L205,310',
  'M190,330 L150,345 L135,320',
  'M145,255 L115,225 L80,230',
  'M130,195 L105,155 L70,145',
  'M145,145 L180,110 L170,75',
];

const CRACK_RINGS: string[] = [
  'M235,190 L225,155 L195,150 L165,165 L160,200 L175,230 L205,240 L230,225 Z',
  'M265,180 L235,120 L180,105 L130,140 L120,200 L145,255 L200,280 L255,255 L270,215 Z',
];

const CRACK_SHARDS: string[] = [
  '200,200 235,190 225,155',
  '200,200 225,155 195,150',
  '200,200 195,150 165,165',
  '200,200 165,165 160,200',
  '200,200 160,200 175,230',
  '200,200 175,230 205,240',
  '200,200 205,240 230,225',
  '200,200 230,225 235,190',
];

let isLowEndDevice = false;
if (typeof window !== 'undefined') {
  const lowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) ||
                 ((navigator as any).deviceMemory && (navigator as any).deviceMemory < 4);
  isLowEndDevice = Boolean(lowEnd);
}

export default function SplashScreen({ isLoading, onComplete }: SplashScreenProps) {
  const [stage, setStage] = useState<Stage>('ride');
  const [badgeError, setBadgeError] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reachedHoldRef = useRef(false);
  const isReducedRef = useRef(false);
  const [isLowEnd] = useState(isLowEndDevice);
  const [skipFaded, setSkipFaded] = useState(false);

  useEffect(() => {
    if (isReducedRef.current) return;
    const id = setTimeout(() => setSkipFaded(true), 1200);
    return () => clearTimeout(id);
  }, []);

  const addTimer = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const runSequence = useCallback(() => {
    clearTimers();
    reachedHoldRef.current = false;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    isReducedRef.current = reduced;

    if (reduced) {
      setStage('hold');
      reachedHoldRef.current = true;
      return;
    }

    setStage('ride');

    // ── SLAPSTICK TIMING SEQUENCE ──
    // 1. Rider memecut laju dari kanan (0ms -> 650ms)
    // 2. 650ms: Hentam cermin telefon! Melekat & leper (Impact & stick to glass)
    addTimer(() => {
      setStage('impact');
      triggerDramaticImpact().catch(() => {});
    }, 650);

    // 3. 1300ms (selepas 650ms melekat dazed): Rider mula meluncur gelongsor perlahan-lahan ke bawah (Slow slide down)
    addTimer(() => {
      setStage('slide');
    }, 1300);

    // 4. 2350ms: Rider dah meluncur habis ke bawah, mendedahkan logo Restoran Wawasan sepenuhnya
    addTimer(() => {
      setStage('hold');
      reachedHoldRef.current = true;
    }, 2350);
  }, []);

  useEffect(() => {
    runSequence();
    return () => clearTimers();
  }, [runSequence]);

  useEffect(() => {
    if (!isLoading && reachedHoldRef.current && stage === 'hold') {
      if (isReducedRef.current) {
        addTimer(() => setStage('exit'), 100);
      } else {
        addTimer(() => setStage('logoZoom'), 350);
      }
    }
  }, [isLoading, stage]);

  useEffect(() => {
    if (stage === 'logoZoom') {
      addTimer(() => setStage('exit'), 850);
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'exit') {
      addTimer(() => {
        if (onComplete) {
          onComplete();
        }
      }, 450);
    }
  }, [stage, onComplete]);

  const handleSkip = () => {
    clearTimers();
    if (onComplete) {
      onComplete();
    }
  };

  const isRiding = stage === 'ride';
  const isImpacted = stage === 'impact';
  const isSliding = stage === 'slide';
  const isFading = stage === 'logoZoom';
  const showTitle = stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const showSlideSmear = isImpacted || isSliding || stage === 'hold';
  const crackVisible = isImpacted || isSliding;

  return (
    <AnimatePresence>
      {/* ── MAIN SPLASH SCENE ──────────────────────────────────────────────── */}
      {stage !== 'exit' && stage !== 'logoZoom' && (
        <motion.div
          key="splash-bg"
          className={cn(
            "fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none",
            "bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#d97706]"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.2, ease: 'easeOut' } }}
        >
          {/* Putrajaya Sticker Wallpaper Background - GPU Optimized without expensive blend-modes/filters */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={getAssetUrl('/assets/heritage/putrajaya_stickerbomb.jpg')}
              alt="Putrajaya Sticker Wallpaper"
              className="w-full h-full object-cover object-center opacity-20"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#fde047]/70 via-[#f59e0b]/60 to-[#d97706]/80" />
            {/* Pure CSS Radial Gradients instead of heavy GPU Gaussian blur passes */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(254,240,138,0.5)_0%,transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(234,88,12,0.3)_0%,transparent_60%)]" />
          </div>

          {/* Batik Dots Pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.15]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="sp-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2"  cy="2"  r="1.2" fill="#0c453c" />
                  <circle cx="14" cy="14" r="1.2" fill="#78350f" />
                  <circle cx="14" cy="2"  r="0.7" fill="#ffffff" />
                  <circle cx="2"  cy="14" r="0.7" fill="#ffffff" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sp-dots)" />
            </svg>
          </div>

          {/* Skip Button */}
          <button
            type="button"
            onClick={handleSkip}
            aria-label="Langkau skrin percikan"
            className="absolute right-6 z-[10000] px-3.5 py-1.5 rounded-full bg-black/25 active:scale-95 border border-white/30 text-[10px] font-bold tracking-widest text-white uppercase transition-all duration-500 hover:bg-black/40 pointer-events-auto focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0c453c]"
            style={{
              top: 'calc(1.5rem + var(--safe-area-inset-top, 0px))',
              opacity: skipFaded ? 0.35 : 1,
            }}
          >
            Langkau
          </button>

          {/* Loading / Ready Indicator */}
          {showTitle && (
            <div
              className="absolute left-0 right-0 flex justify-center pointer-events-none z-20"
              style={{ bottom: 'calc(5% + var(--safe-area-inset-bottom, 0px))' }}
              aria-live="polite"
            >
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/25 backdrop-blur-md shadow-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fde047] opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fde047]" />
                </span>
                <span className="text-[10px] font-bold tracking-widest text-white/95 uppercase">
                  {isLoading ? 'Menyediakan' : 'Sedia'}
                </span>
              </div>
            </div>
          )}

          {/* Ground line */}
          <div className="absolute bottom-[30%] left-8 right-8 h-px bg-black/20" />

          {/* ── RIDER ANIMATION SCENE ──────────────────────────────────────── */}
          <motion.div
            className="absolute inset-x-4 top-[25%] bottom-[30%] flex items-center justify-center z-20 transform-gpu"
            animate={{
              x: isImpacted ? [0, -12, 10, -8, 6, -3, 0] : 0,
              y: isImpacted ? [0, 9, -10, 7, -4, 2, 0] : 0,
            }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
          >
            {/* Logo - Back Layer revealed behind rider as he slides down */}
            <motion.img
              src={getAssetUrl('/assets/brand/wawasan_logo_badge.png')}
              alt="Logo"
              className="absolute w-44 h-44 object-contain z-10 drop-shadow-lg transform-gpu"
              style={{ willChange: 'transform, opacity' }}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={
                stage === 'slide' || stage === 'hold' || showTitle
                  ? { scale: [0.85, 1.05, 1], opacity: 1 }
                  : isImpacted
                  ? { scale: 0.7, opacity: 0.4 }
                  : { scale: 0.2, opacity: 0 }
              }
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              draggable={false}
            />

            {/* ── COMIC GLASS SMUDGE & SLIDE STREAK ── */}
            <AnimatePresence>
              {showSlideSmear && (
                <motion.div
                  key="slide-smudge-layer"
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-15 overflow-hidden transform-gpu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.5 } }}
                >
                  {/* Top Impact Fog Smear */}
                  <motion.div
                    className="absolute rounded-[50%] bg-white/35"
                    style={{ width: 170, height: 75, top: '42%', willChange: 'transform, opacity' }}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={
                      isImpacted
                        ? { opacity: [0, 0.75, 0.5], scaleX: [0.6, 1.35, 1.15], scaleY: [0.4, 0.75, 0.65] }
                        : isSliding
                        ? { opacity: 0.3, scaleX: 1.05, scaleY: 0.55 }
                        : { opacity: [0.3, 0] }
                    }
                    transition={{ duration: 0.75, ease: 'easeOut' }}
                  />

                  {/* Vertical Squeegee Slide Streak (GPU scaleY instead of height to prevent reflows) */}
                  {(isSliding || stage === 'hold') && (
                    <motion.div
                      className="absolute flex flex-col items-center transform-gpu"
                      style={{
                        top: '44%',
                        width: 130,
                        height: 260,
                        transformOrigin: 'top center',
                        willChange: 'transform, opacity',
                      }}
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{
                        scaleY: isSliding ? [0, 0.35, 0.7, 1] : 1,
                        opacity: isSliding ? [0, 0.55, 0.4] : [0.4, 0],
                      }}
                      transition={{ duration: isSliding ? 0.95 : 0.75, ease: 'easeOut' }}
                    >
                      {/* Translucent smear body */}
                      <div className="w-full h-full bg-gradient-to-b from-white/30 via-white/15 to-transparent rounded-b-2xl" />
                      
                      {/* Vertical cartoon friction wipe lines */}
                      <div className="absolute inset-y-0 left-4 w-0.5 bg-white/35" />
                      <div className="absolute inset-y-2 left-10 w-0.5 bg-white/25" />
                      <div className="absolute inset-y-1 right-8 w-0.5 bg-white/30" />
                      <div className="absolute inset-y-4 right-4 w-0.5 bg-white/20" />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dazed Dizzy Cartoon Stars when hitting the glass */}
            {isImpacted && (
              <motion.div
                className="absolute z-30 pointer-events-none transform-gpu"
                style={{ top: '28%', willChange: 'transform, opacity' }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: [0, 1, 0.9], scale: [0.2, 1.15, 1], rotate: [0, 180] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <div className="relative flex items-center justify-center w-28 h-10">
                  <span className="absolute left-1 top-0 text-amber-200 text-lg drop-shadow font-black animate-bounce">⭐</span>
                  <span className="absolute right-2 top-1 text-yellow-100 text-sm drop-shadow font-black animate-pulse">✨</span>
                  <span className="absolute left-8 -top-3 text-amber-300 text-xs drop-shadow font-black animate-spin">💫</span>
                </div>
              </motion.div>
            )}

            {/* Rider - Middle Layer: Slams on glass then slowly slides down */}
            <motion.div
              className="relative w-full max-w-sm aspect-square flex items-center justify-center z-25 pointer-events-none transform-gpu"
              style={{ willChange: 'transform, opacity' }}
              initial={{ x: '100vw', y: 0, scale: 0.95, opacity: 0, rotate: 6 }}
              animate={
                isFading
                  ? { x: 0, y: 500, opacity: 0 }
                  : stage === 'hold'
                  ? { x: 0, y: 500, opacity: 0 }
                  : isSliding
                  ? {
                      x: 0,
                      y: [0, 35, 95, 185, 310, 480],
                      rotate: [-4, 6, -5, 9, 14, 18],
                      scale: [1, 1, 0.98, 0.95, 0.9, 0.85],
                      opacity: [1, 1, 0.95, 0.8, 0.4, 0],
                    }
                  : isImpacted
                  ? {
                      x: 0,
                      y: 0,
                      opacity: 1,
                      rotate: [-6, 5, -2, 0],
                      scale: [1, 1.08, 1],
                    }
                  : { x: '100vw', y: 0, opacity: 1, scale: 1, rotate: 6 }
              }
              transition={
                isSliding
                  ? {
                      duration: 1.05,
                      ease: [0.4, 0, 0.6, 1],
                      times: [0, 0.18, 0.4, 0.65, 0.88, 1],
                    }
                  : isImpacted
                  ? { duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }
                  : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <img
                src={getAssetUrl('/assets/ui/rider-grouped.svg')}
                alt="Restoran Wawasan Delivery Rider"
                className="w-full h-full object-contain drop-shadow-md bg-transparent"
                style={{ background: 'transparent' }}
                draggable={false}
              />
            </motion.div>
          </motion.div>

          {/* ── SCREEN CRACK IMPACT — vector glass crack overlay ── */}
          <AnimatePresence>
            {crackVisible && (
              <motion.div
                key="crack-overlay"
                className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden transform-gpu"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeOut' } }}
              >
                {/* Impact flash */}
                <motion.div
                  className="absolute inset-0 bg-white pointer-events-none"
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                />

                <motion.svg
                  viewBox="0 0 400 400"
                  className="absolute w-[240%] h-[240%] max-w-none sm:w-[190%] sm:h-[190%]"
                  style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.35))' }}
                >
                  {/* Glass shards near the impact point */}
                  {CRACK_SHARDS.map((points, i) => (
                    <motion.polygon
                      key={`shard-${i}`}
                      points={points}
                      fill="rgba(255,255,255,0.06)"
                      stroke="rgba(255,255,255,0.45)"
                      strokeWidth={0.5}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0, 1, 0.5], scale: [0.8, 1.08, 1] }}
                      transition={{ duration: 0.4, delay: 0.02 + i * 0.01, ease: 'easeOut' }}
                      style={{ transformOrigin: '200px 200px' }}
                    />
                  ))}

                  {/* Inner web rings around the impact point */}
                  {CRACK_RINGS.map((d, i) => (
                    <motion.path
                      key={`ring-${i}`}
                      d={d}
                      fill="none"
                      stroke="rgba(255,255,255,0.55)"
                      strokeWidth={0.7}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.18, delay: 0.03 + i * 0.025, ease: 'easeOut' }}
                    />
                  ))}

                  {/* Main jagged crack fissures */}
                  {CRACK_MAIN.map((d, i) => (
                    <motion.path
                      key={`main-${i}`}
                      d={d}
                      fill="none"
                      stroke="rgba(255,255,255,0.85)"
                      strokeWidth={1.1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.1, delay: i * 0.006, ease: 'easeOut' }}
                    />
                  ))}

                  {/* Secondary branch fissures */}
                  {CRACK_BRANCHES.map((d, i) => (
                    <motion.path
                      key={`branch-${i}`}
                      d={d}
                      fill="none"
                      stroke="rgba(255,255,255,0.65)"
                      strokeWidth={0.65}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.14, delay: 0.02 + i * 0.008, ease: 'easeOut' }}
                    />
                  ))}
                </motion.svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Motion trail behind speeding rider */}
          {isRiding && (
            <motion.div
              className="absolute bottom-[38%] flex flex-col gap-1.5 z-10"
              style={{ right: '50%' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0.85, 0] }}
              transition={{ duration: 0.72, times: [0, 0.15, 0.75, 1] }}
            >
              {[58, 40, 24].map((w, i) => (
                <div
                  key={i}
                  className="h-0.5 rounded-full bg-white/30"
                  style={{ width: w }}
                />
              ))}
            </motion.div>
          )}

          {/* Brand title + underline */}
          <motion.div
            className="absolute bottom-[14%] left-0 right-0 text-center px-6 z-20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: showTitle ? 1 : 0, y: showTitle ? 0 : 10 }}
            transition={isLowEnd
              ? { duration: 0.4, ease: 'easeOut' }
              : { type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }
            }
          >
            <div className="flex items-center justify-center gap-1.5 text-sm font-semibold tracking-widest text-white/95 uppercase">
              <span>Restoran</span>
              <span className="text-[#e96212] font-black text-base">WAWASAN</span>
              <span className="text-[#f69913] font-bold">Pak Usop</span>
            </div>

            <div className="w-44 h-[2.5px] bg-black/20 rounded-full mx-auto mt-2 overflow-hidden border border-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#e96212,#f69913)', transformOrigin: 'left' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: showTitle ? 1 : 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
              />
            </div>

            <p className="text-[10px] font-medium tracking-widest text-white/75 uppercase mt-1.5">
              Sistem Tempahan Katering Putrajaya
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* ── LOGO ZOOM FRAME (closing transition beat) ────────────────────────── */}
      {(stage === 'logoZoom' || stage === 'exit') && (
        <motion.div
          key="logo-zoom"
          className={cn(
            "fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden transition-colors duration-500",
            "bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#d97706]"
          )}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Sticker bomb background layer - lightweight */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={getAssetUrl('/assets/heritage/putrajaya_stickerbomb.jpg')}
              alt="Putrajaya Sticker Bomb Wallpaper"
              className="w-full h-full object-cover object-center opacity-20"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#fde047]/70 via-[#f59e0b]/60 to-[#d97706]/80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(254,240,138,0.5)_0%,transparent_65%)]" />
          </div>
          {!badgeError ? (
            <motion.img
              src={getAssetUrl('/assets/brand/wawasan_logo_badge.png')}
              alt="Restoran Wawasan"
              className="w-60 h-60 object-contain drop-shadow-xl transform-gpu"
              style={{ willChange: 'transform, opacity' }}
              draggable={false}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                scale: isLowEnd
                  ? { duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }
                  : { type: 'spring', stiffness: 260, damping: 18, delay: 0.05 },
                opacity: { duration: 0.2, ease: 'easeOut', delay: 0.05 },
              }}
              onError={() => setBadgeError(true)}
            />
          ) : (
            <div className="text-center">
              <p className="text-2xl font-black text-[#e96212] tracking-tight">RESTORAN</p>
              <p className="text-3xl font-black text-white tracking-tight">WAWASAN</p>
              <p className="text-sm text-[#f69913] font-semibold tracking-widest uppercase mt-1">Est. 1986</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

