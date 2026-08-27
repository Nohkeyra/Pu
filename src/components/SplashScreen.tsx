import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAssetUrl, cn } from '@/lib/utils';

// F-SPLASH: Animated delivery rider splash screen with Kunyit Gold Dark Mode & Putrajaya Sticker.

export interface SplashScreenProps {
  isLoading: boolean;
  onComplete?: () => void;
}

type Stage = 'ride' | 'settle' | 'lift' | 'flip' | 'hold' | 'logoZoom' | 'exit';

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
    const id = setTimeout(() => setSkipFaded(true), 1500);
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

    if (isLowEnd) {
      addTimer(() => setStage('settle'), 1100);
      addTimer(() => setStage('lift'), 1350);
      addTimer(() => setStage('flip'), 1600);
      addTimer(() => {
        setStage('hold');
        reachedHoldRef.current = true;
      }, 2000);
    } else {
      addTimer(() => setStage('settle'), 1400);
      addTimer(() => setStage('lift'), 1900);
      addTimer(() => setStage('flip'), 2200);
      addTimer(() => {
        setStage('hold');
        reachedHoldRef.current = true;
      }, 2800);
    }
  }, [isLowEnd]);

  useEffect(() => {
    runSequence();
    return () => clearTimers();
  }, [runSequence]);

  useEffect(() => {
    if (!isLoading && reachedHoldRef.current && stage === 'hold') {
      if (isReducedRef.current) {
        addTimer(() => setStage('exit'), 150);
      } else {
        addTimer(() => setStage('logoZoom'), 400);
      }
    }
  }, [isLoading, stage]);

  useEffect(() => {
    if (stage === 'logoZoom') {
      addTimer(() => setStage('exit'), 950);
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'exit') {
      addTimer(() => {
        if (onComplete) {
          onComplete();
        }
      }, 500);
    }
  }, [stage, onComplete]);

  const handleSkip = () => {
    clearTimers();
    if (onComplete) {
      onComplete();
    }
  };

  const isRiding = stage === 'ride';
  const isSettling = stage === 'settle' || stage === 'lift' || stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const isLifting = stage === 'lift' || stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const isFlipped = stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const showTitle = stage === 'hold' || stage === 'logoZoom' || stage === 'exit';

  return (
    <AnimatePresence>
      {/* ── MAIN SPLASH SCENE ──────────────────────────────────────────────── */}
      {stage !== 'exit' && stage !== 'logoZoom' && (
        <motion.div
          key="splash-bg"
          className={cn(
            "fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none transition-colors duration-700",
            "bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#d97706]"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Putrajaya Sticker Wallpaper Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={getAssetUrl('/assets/heritage/putrajaya_stickerbomb.jpg')}
              alt="Putrajaya Sticker Wallpaper"
              className="w-full h-full object-cover object-center opacity-35 mix-blend-multiply scale-105"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#fde047]/60 via-[#f59e0b]/50 to-[#d97706]/70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(254,240,138,0.35)_0%,transparent_80%)]" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-[#fef08a]/50 rounded-full blur-[110px]" />
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-[#ea580c]/35 rounded-full blur-[90px]" />
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
            className="absolute right-6 z-[10000] px-3.5 py-1.5 rounded-full bg-black/20 active:scale-95 border border-white/30 text-[10px] font-bold tracking-widest text-white uppercase transition-all duration-500 hover:bg-black/30 pointer-events-auto focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0c453c]"
            style={{
              top: 'calc(1.5rem + var(--safe-area-inset-top, 0px))',
              opacity: skipFaded ? 0.3 : 1,
            }}
          >
            Langkau
          </button>

          {/* Loading Indicator */}
          {showTitle && (
            <div
              className="absolute left-0 right-0 flex justify-center pointer-events-none z-20"
              style={{ bottom: 'calc(5% + var(--safe-area-inset-bottom, 0px))' }}
              aria-live="polite"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/25 backdrop-blur-md shadow-lg">
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
          <div className="absolute inset-x-4 top-[25%] bottom-[32%] flex items-center justify-center z-20">
            <motion.div
              className="relative w-full max-w-sm aspect-square flex items-center justify-center"
              initial={{ x: '-110vw', opacity: 0, rotate: -8 }}
              animate={
                isFlipped
                  ? { x: 0, y: [0, -12, 0], opacity: 1, rotate: [0, 4, 0], scale: [1, 1.03, 1] }
                  : isLifting
                  ? { x: 0, y: [0, -18, -4], opacity: 1, rotate: [0, -4, 2] }
                  : isSettling
                  ? { x: 0, y: [0, 6, 0], opacity: 1, rotate: [0, 2, 0] }
                  : { x: 0, opacity: 1, rotate: 0 }
              }
              transition={
                isFlipped
                  ? { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                  : isLifting
                  ? { duration: 0.45, ease: 'easeOut' }
                  : isSettling
                  ? { duration: 0.35, ease: 'easeInOut' }
                  : isLowEnd
                  ? { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
                  : { type: 'spring', stiffness: 90, damping: 14 }
              }
            >
              <img
                src={getAssetUrl('/assets/ui/rider-grouped.svg')}
                alt="Restoran Wawasan Delivery Rider"
                className="w-full h-full object-contain pointer-events-none drop-shadow-2xl bg-transparent"
                style={{ background: 'transparent' }}
                draggable={false}
              />
            </motion.div>
          </div>

          {/* Motion trail */}
          {isRiding && (
            <motion.div
              className="absolute bottom-[38%] flex flex-col gap-1.5 z-10"
              style={{ right: '55%' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0.7, 0] }}
              transition={{ duration: 1.1, times: [0, 0.15, 0.75, 1] }}
            >
              {[52, 36, 22].map((w, i) => (
                <div
                  key={i}
                  className="h-0.5 rounded-full bg-white/20"
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

            <p className="text-[10px] font-medium tracking-widest text-white/70 uppercase mt-1.5">
              Sistem Tempahan Katering Putrajaya
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* ── LOGO ZOOM FRAME (closing beat) ────────────────────────────────── */}
      {(stage === 'logoZoom' || stage === 'exit') && (
        <motion.div
          key="logo-zoom"
          className={cn(
            "fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden transition-colors duration-500",
            "bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#d97706]"
          )}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Sticker bomb background layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={getAssetUrl('/assets/heritage/putrajaya_stickerbomb.jpg')}
              alt="Putrajaya Sticker Bomb Wallpaper"
              className="w-full h-full object-cover object-center opacity-35 mix-blend-multiply scale-105"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#fde047]/60 via-[#f59e0b]/50 to-[#d97706]/70" />
          </div>
          <motion.img
            src={getAssetUrl('/assets/brand/wawasan_logo_badge.png')}
            alt="Restoran Wawasan"
            className="w-60 h-60 object-contain drop-shadow-2xl"
            draggable={false}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              scale: isLowEnd
                ? { duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.06 }
                : { type: 'spring', stiffness: 260, damping: 18, delay: 0.06 },
              opacity: { duration: 0.22, ease: 'easeOut', delay: 0.06 },
            }}
            onError={() => setBadgeError(true)}
            style={badgeError ? { display: 'none' } : {}}
          />
          {badgeError && (
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
