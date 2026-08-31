import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAssetUrl, cn } from '@/lib/utils';
import { SplashScreen as NativeSplashScreen } from '@capacitor/splash-screen';

// F-SPLASH: Animated delivery rider splash screen with Kunyit Gold Dark Mode & Putrajaya Sticker.

export interface SplashScreenProps {
  isLoading: boolean;
  onComplete?: () => void;
}

type Stage = 'ride' | 'settle' | 'lift' | 'flip' | 'hold' | 'impact' | 'logoZoom' | 'exit';

// F-CRACK: Dramatic shatter geometry for the impact beat.
// Centered on a 400x400 viewBox so it can cover the FULL splash (not just the rider box).
// Hand-jagged (not straight lines) so it reads as broken glass, not an asterisk.
const CRACK_MAIN: string[] = [
  'M200,200 L215,140 L195,80 L205,25',
  'M200,200 L255,165 L300,140 L345,110',
  'M200,200 L265,205 L330,195 L385,205',
  'M200,200 L250,245 L290,300 L330,345',
  'M200,200 L210,260 L190,320 L200,375',
  'M200,200 L150,250 L105,290 L60,330',
  'M200,200 L135,195 L70,205 L15,195',
  'M200,200 L150,150 L110,100 L65,55',
];

const CRACK_BRANCHES: string[] = [
  'M215,140 L250,120 L270,90',
  'M255,165 L280,200 L310,220',
  'M265,205 L280,240 L275,275',
  'M250,245 L215,270 L200,300',
  'M190,320 L155,335 L140,315',
  'M150,250 L120,220 L90,225',
  'M135,195 L110,160 L80,150',
  'M150,150 L180,120 L175,85',
];

const CRACK_RINGS: string[] = [
  'M235,190 L225,155 L195,150 L165,165 L160,200 L175,230 L205,240 L230,225 Z',
  'M260,180 L235,120 L180,105 L130,140 L120,200 L145,255 L200,275 L250,255 L265,215 Z',
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
    // 1. Rider zooms in rapidly from the right and hits center at exactly 800ms
    // 2. AT EXACTLY 800ms: IMPACT happens! Logo slams in, Screen cracks, Flash & shake trigger together
    addTimer(() => setStage('impact'), 800);
    // 3. Shockwave & recoil: Rider is pushed / lifted from impact
    addTimer(() => setStage('lift'), 1400);
    // 4. Rider begins fading / disintegrating
    addTimer(() => setStage('flip'), 1800);
    // 5. Hold before transitioning to final logo zoom
    addTimer(() => {
      setStage('hold');
      reachedHoldRef.current = true;
    }, 2400);
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
  const isImpacted = stage === 'impact';
  const isFading = stage === 'logoZoom';
  const isFlipped = stage === 'flip' || stage === 'hold';
  const isLifting = stage === 'lift' || isFlipped;
  const showTitle = stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  // Crack appears on impact and stays put through the rest of the ride-out,
  // instead of vanishing the instant the 'impact' stage ends.
  const crackVisible = isImpacted || isLifting;

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
          animate={{
            opacity: 1,
            x: isImpacted ? [0, -7, 6, -4, 3, 0] : 0,
            y: isImpacted ? [0, 4, -5, 3, -2, 0] : 0,
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.25, ease: 'easeOut' },
            x: isImpacted ? { duration: 0.42, ease: 'easeOut' } : { duration: 0.2 },
            y: isImpacted ? { duration: 0.42, ease: 'easeOut' } : { duration: 0.2 },
          }}
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
            {/* Logo - Back Layer slamming in right from behind on impact */}
            <motion.img
              src={getAssetUrl('/assets/brand/wawasan_logo_badge.png')}
              alt="Logo"
              className="absolute w-44 h-44 object-contain z-10"
              initial={{ scale: 0.1, opacity: 0 }}
              animate={
                isImpacted || isLifting || isFlipped || showTitle
                  ? { scale: [0.2, 1.15, 1], opacity: 1 }
                  : { scale: 0.1, opacity: 0 }
              }
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              draggable={false}
            />

            {/* Rider - Middle Layer rushing in and crashing at center */}
            <motion.div
              className="relative w-full max-w-sm aspect-square flex items-center justify-center z-20"
              initial={{ x: '100vw', scale: 0.95, opacity: 0, rotate: 6 }}
              animate={
                isFading
                  ? { x: 0, opacity: 0, scale: 0.8, filter: 'blur(4px)' }
                  : isFlipped
                  ? { x: 0, y: [0, -10, 0], opacity: 0.4, rotate: [0, 4, 0], scale: 0.95 }
                  : isLifting
                  ? { x: 0, y: [0, -20, -6], opacity: 0.8, rotate: [0, -6, 3], scale: 1.05 }
                  : isImpacted
                  ? { x: 0, y: 0, opacity: 1, rotate: [-4, 4, -2, 0], scale: [1.2, 1.05] }
                  : { x: '100vw', opacity: 1, scale: 1, rotate: 6 }
              }
              transition={
                isFading
                  ? { duration: 0.4, ease: 'easeOut' }
                  : isFlipped
                  ? { duration: 0.4, ease: 'easeOut' }
                  : isLifting
                  ? { duration: 0.35, ease: 'easeOut' }
                  : isImpacted
                  ? { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
                  : { duration: 0.78, ease: [0.22, 1, 0.36, 1] }
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

          {/* ── SCREEN CRACK IMPACT — dramatic full-screen shatter, not the tiny asterisk ── */}
          <AnimatePresence>
            {crackVisible && (
              <motion.div
                key="crack-overlay"
                className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.28, ease: 'easeOut' } }}
              >
                {/* Impact flash */}
                <motion.div
                  className="absolute inset-0 bg-white"
                  style={{ mixBlendMode: 'screen' }}
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />

                <motion.svg
                  viewBox="0 0 400 400"
                  className="absolute w-[240%] h-[240%] max-w-none sm:w-[190%] sm:h-[190%]"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.55))' }}
                >
                  <defs>
                    <radialGradient id="sp-crack-flash" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                      <stop offset="40%" stopColor="#ffffff" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Shockwave burst at impact point */}
                  <motion.circle
                    cx={200}
                    cy={200}
                    r={10}
                    fill="url(#sp-crack-flash)"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 13, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{ transformOrigin: '200px 200px' }}
                  />

                  {/* Glass shards near the impact point, for depth */}
                  {CRACK_SHARDS.map((points, i) => (
                    <motion.polygon
                      key={`shard-${i}`}
                      points={points}
                      fill="rgba(255,255,255,0.07)"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth={0.6}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: [0, 1, 0.45], scale: [0.85, 1.05, 1] }}
                      transition={{ duration: 0.5, delay: 0.03 + i * 0.012, ease: 'easeOut' }}
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
                      strokeWidth={1}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.22, delay: 0.05 + i * 0.03, ease: 'easeOut' }}
                    />
                  ))}

                  {/* Main jagged crack fissures - instantaneous sharp shatter */}
                  {CRACK_MAIN.map((d, i) => (
                    <motion.path
                      key={`main-${i}`}
                      d={d}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.12, delay: i * 0.005, ease: 'easeOut' }}
                    />
                  ))}

                  {/* Secondary branch fissures */}
                  {CRACK_BRANCHES.map((d, i) => (
                    <motion.path
                      key={`branch-${i}`}
                      d={d}
                      fill="none"
                      stroke="rgba(255,255,255,0.85)"
                      strokeWidth={1.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.15, delay: 0.02 + i * 0.008, ease: 'easeOut' }}
                    />
                  ))}
                </motion.svg>
              </motion.div>
            )}
          </AnimatePresence>

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
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
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
