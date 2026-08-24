import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAssetUrl, cn } from '@/lib/utils';

// F-SPLASH: Animated splash screen with Kunyit Gold Dark Mode & Putrajaya Sticker.
//
// DARK MODE STYLING:
//   When dark mode is active, the background switches to a rich "Gold Kunyit"
//   (turmeric gold) canvas gradient (#1c1303 → #3a2700 → #170f02) with glowing
//   amber ambient light flares and golden batik dot accents.
//
// PUTRAJAYA BOMB STICKER:
//   An illustrated die-cut bomb sticker badge featuring the iconic Putrajaya view
//   (Putra Mosque & Seri Wawasan Bridge) floats in the scene with a pop rotation.

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
  const [riderSvgError, setRiderSvgError] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reachedHoldRef = useRef(false);
  const isReducedRef = useRef(false);
  const [isLowEnd] = useState(isLowEndDevice);
  const [skipFaded, setSkipFaded] = useState(false);

  // Auto-fade Skip button after rider settles
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
  const isSettling = stage === 'settle';
  const showOverlay = stage === 'lift' || stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const doFlip = stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const showTitle = stage === 'hold' || stage === 'logoZoom' || stage === 'exit';

  return (
    <AnimatePresence>
      {/* ── MAIN SPLASH SCENE ──────────────────────────────────────────────── */}
      {stage !== 'exit' && stage !== 'logoZoom' && (
        <motion.div
          key="splash-bg"
          className={cn(
            "fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none transition-colors duration-700",
            "bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#d97706]" // Warm Sunshine Kunyit Yellow
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* FULL SIZE PUTRAJAYA STICKER BOMB WALLPAPER OVER YELLOW CANVAS */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={getAssetUrl('/assets/heritage/putrajaya_stickerbomb.jpg')}
              alt="Putrajaya Sticker Bomb Wallpaper"
              className="w-full h-full object-cover object-center opacity-35 mix-blend-multiply scale-105"
              draggable={false}
            />
            {/* Yellow Kunyit Radial & Overlay Blends */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#fde047]/60 via-[#f59e0b]/50 to-[#d97706]/70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(254,240,138,0.35)_0%,transparent_80%)]" />
            {/* Yellow Ambient Flares & Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-[#fef08a]/50 rounded-full blur-[110px]" />
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-[#ea580c]/35 rounded-full blur-[90px]" />
          </div>

          {/* Batik-style dot background */}
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

          {/* ── RIDER RIG ─────────────────────────────────────────────────── */}
          <motion.div
            className="absolute bottom-[28%] left-1/2 z-20"
            initial={{ x: 'calc(-50% - 100vw)' }}
            animate={{
              x: '-50%',
              y: isSettling ? (isLowEnd ? [0, -8, 0] : [0, 14, -6, 2, 0]) : 0,
            }}
            transition={{
              x: isLowEnd
                ? { duration: 1.1, ease: [0.22, 1, 0.36, 1] }
                : { type: 'spring', stiffness: 60, damping: 14, mass: 1.2 },
              y: isLowEnd
                ? { duration: 0.25, ease: 'easeOut' }
                : { type: 'spring', stiffness: 180, damping: 10, mass: 0.8 },
            }}
          >
            <div className="relative w-72 h-72">
              {!riderSvgError ? (
                <img
                  src={getAssetUrl('/assets/ui/rider-grouped.svg')}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-contain"
                  style={{ transform: 'scaleX(-1)' }}
                  draggable={false}
                  onError={() => setRiderSvgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <img
                      src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
                      alt="Restoran Wawasan"
                      className="w-full h-full object-contain drop-shadow-lg"
                      draggable={false}
                    />
                  </div>
                </div>
              )}

              {/* Delivery Bag Flip Overlay */}
              {showOverlay && !riderSvgError && (
                <div
                  className="absolute"
                  style={{
                    left: '15.4%',
                    top: '25.6%',
                    width: '18.3%',
                    height: '37.5%',
                    perspective: '800px',
                  }}
                >
                  <motion.div
                    className="w-full h-full relative"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{
                      y: showOverlay ? -8 : 0,
                      rotate: showOverlay ? -6 : 0,
                      rotateY: doFlip ? 180 : 0,
                    }}
                    transition={{
                      y: isLowEnd
                        ? { duration: 0.3, ease: 'easeOut' }
                        : { type: 'spring', stiffness: 280, damping: 18 },
                      rotate: isLowEnd
                        ? { duration: 0.3, ease: 'easeOut' }
                        : { type: 'spring', stiffness: 280, damping: 18 },
                      rotateY: isLowEnd
                        ? { duration: 0.45, ease: [0.4, 0, 0.2, 1], delay: 0.1 }
                        : { type: 'spring', stiffness: 120, damping: 14, delay: 0.08 },
                    }}
                  >
                    <div
                      className="absolute inset-0 flex items-center justify-center overflow-visible"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <img
                        src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
                        alt="Restoran Wawasan"
                        className="w-[120%] h-[120%] object-contain drop-shadow-lg"
                        draggable={false}
                      />
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>

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
            src={getAssetUrl('/assets/brand/wawasan_logo.svg')}
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
