import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';

// F-SPLASH (2026-08-09): Animated splash screen replacing AppSplashScreen.tsx.
//
// APPROACH — hybrid img + Framer Motion overlay:
//   The rider illustration (rider-grouped.svg, ~1.38MB) is served as a static
//   asset via <img>, not inline-embedded in JSX. This keeps the component file
//   maintainable and lets Vite's asset pipeline handle caching. CSS @keyframes
//   inside the SVG animate the wheels, head, arm, and bag continuously.
//
//   The "delivery bag flip reveal" is achieved by overlaying a Framer Motion
//   div precisely over the bag's position (calculated from its bounding box in
//   the 1100×1100 viewBox: x=729–930, y=282–695, center≈75.4%/44.4% of SVG).
//   When the flip moment arrives, the overlay mounts over the bag region and
//   performs a rotateY(180deg) 3D flip to reveal the Wawasan signage.
//
// BUG FIX applied to rider-grouped.svg on disk:
//   Front wheel CSS transform-origin was 198.5px 562.5px (wrong — caused
//   wobbly/off-center rotation). Corrected to 478.5px 630.0px (actual wheel
//   center from bounding box analysis). Rear wheel (573.5px 840px) was correct.
//
// ANIMATION TIMELINE (spring-physics, not fixed-duration):
//   0.00 – 1.40s  ride      : Rider enters — slow start, burst, spring overshoot+settle
//   1.40 – 1.90s  settle    : Heavy motor landing, spring bounce (feels weighted)
//   1.90 – 2.20s  lift      : Bag lifts snappy
//   2.20 – 2.80s  flip      : rotateY spring flip, slight overshoot past 180°
//   2.80 – 3.30s  hold      : Title + underline reveal with breathing room
//   3.30s+        hold wait : Waits for isLoading === false
//   hold+0.3s     logoZoom  : Logo spring-zooms in (scale 0.2→1.08→1.0 overshoot)
//   logoZoom+0.8s exit      : Hold beat then fade to black 0.5s
//
// isLoading CONTRACT (preserved from AppSplashScreen.tsx):
//   Animation plays in full on its fixed timeline. At the 'hold' stage it waits
//   — it will NOT exit before isLoading becomes false. This prevents the splash
//   disappearing mid-load (blank screen flash) even on slow networks.
//   prefers-reduced-motion: skips to hold instantly, exits directly (no logoZoom).

// COLOR PALETTE (2026-08-14 restyle): charcoal (#121214/#1b1b1e), sunshine
// mustard (#f69913), and crisp-carrot burnt-orange (#e96212) — same 4-color
// system as the rest of the app. Colors are hardcoded here rather than using
// Tailwind's bg-charcoal/etc. tokens deliberately: the splash renders before
// theme context is guaranteed to be initialized (it's the very first thing
// shown on app launch), so a token that reacts to the .dark class could be
// unpredictable at that point in the boot sequence. The splash is always
// dark/branded regardless of the user's light/dark preference, matching the
// original design intent — only the specific hex values changed.
//
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
  // ReturnType<typeof setTimeout> — not NodeJS.Timeout (@types/node absent in this project)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reachedHoldRef = useRef(false);
  const isReducedRef = useRef(false);
  const [isLowEnd] = useState(isLowEndDevice);
  const [skipFaded, setSkipFaded] = useState(false);

  // Auto-fade the Skip button once the rider has entered 'settle', so it stops
  // competing with the bag-flip / title reveal. Fades from opacity 1 → 0.25.
  // Focus-visible restores full opacity for keyboard users.
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
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    isReducedRef.current = reduced;

    if (reduced) {
      setStage('hold');
      reachedHoldRef.current = true;
      return;
    }

    setStage('ride');
    
    if (isLowEnd) {
      addTimer(() => setStage('settle'),  1100);
      addTimer(() => setStage('lift'),    1350);
      addTimer(() => setStage('flip'),    1600);
      addTimer(() => {
        setStage('hold');
        reachedHoldRef.current = true;
      }, 2000);
    } else {
      addTimer(() => setStage('settle'),  1400); // rider arrives, spring lands
      addTimer(() => setStage('lift'),    1900); // bag starts lifting after motor settles
      addTimer(() => setStage('flip'),    2200); // bag flips to reveal signage
      addTimer(() => {
        setStage('hold');
        reachedHoldRef.current = true;
      }, 2800); // hold — title reveals, breathing room before waiting for isLoading
    }
  }, [isLowEnd]);

  useEffect(() => {
    runSequence();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gate on isLoading AND having reached hold. If app loads very fast (before
  // 2.0s), this re-fires on the next stage change that sets stage='hold'.
  useEffect(() => {
    if (!isLoading && reachedHoldRef.current && stage === 'hold') {
      if (isReducedRef.current) {
        addTimer(() => setStage('exit'), 150);
      } else {
        addTimer(() => setStage('logoZoom'), 400);
      }
    }
  }, [isLoading, stage]);

  // logoZoom: spring zoom plays (~0.5s), then hold breathing room, then exit.
  // Bumped 800 → 950ms so the logo pulse feels like a deliberate beat.
  useEffect(() => {
    if (stage === 'logoZoom') {
      addTimer(() => setStage('exit'), 950);
    }
  }, [stage]);

  // When stage becomes 'exit', wait for the 500ms fade-out transition, then call onComplete
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

  // Derived booleans used across JSX
  const isRiding    = stage === 'ride';
  const isSettling  = stage === 'settle';
  const showOverlay = stage === 'lift' || stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const doFlip      = stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const showTitle   = stage === 'hold' || stage === 'logoZoom' || stage === 'exit';

  return (
    <AnimatePresence>
      {/* ── MAIN SPLASH SCENE (rider + title) ──────────────────────────────── */}
      {stage !== 'exit' && stage !== 'logoZoom' && (
        <motion.div
          key="splash-bg"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-deep-forest overflow-hidden select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Subtle batik-style dot background */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.1]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="sp-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2"  cy="2"  r="1.2" fill="#f69913" />
                  <circle cx="14" cy="14" r="1.2" fill="#e96212" />
                  <circle cx="14" cy="2"  r="0.7" fill="#ffffff" />
                  <circle cx="2"  cy="14" r="0.7" fill="#ffffff" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sp-dots)" />
            </svg>
          </div>

          {/* Elegant Skip Button (Safely aligned under device notch / safe areas).
              Auto-fades after the rider has settled so it doesn't compete with the
              bag-flip / title reveal. Still fully interactive while faded — opacity
              0 buttons retain their hit-zone on touch screens. */}
          <button
            type="button"
            onClick={handleSkip}
            aria-label="Langkau skrin percikan"
            className="absolute right-6 z-[10000] px-3.5 py-1.5 rounded-full bg-white/5 active:scale-95 border border-white/10 text-[10px] font-bold tracking-widest text-white/70 uppercase transition-all duration-500 hover:bg-white/10 hover:text-white pointer-events-auto focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f69913]"
            style={{
              top: 'calc(1.5rem + var(--safe-area-inset-top, 0px))',
              opacity: skipFaded ? 0.25 : 1,
            }}
          >
            Langkau
          </button>

          {/* LOADING AFFORDANCE — only visible during 'hold' so the user has
              feedback that the app is still preparing (Capacitor plugins, auth
              listeners, etc.) before the closing beat fires. Pure CSS pulse, no
              extra image weight. */}
          {showTitle && (
            <div
              className="absolute left-0 right-0 flex justify-center pointer-events-none"
              style={{ bottom: 'calc(5% + var(--safe-area-inset-bottom, 0px))' }}
              aria-live="polite"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f69913] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f69913]" />
                </span>
                <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
                  {isLoading ? 'Menyediakan' : 'Sedia'}
                </span>
              </div>
            </div>
          )}

          {/* Ground line */}
          <div className="absolute bottom-[30%] left-8 right-8 h-px bg-white/10" />

          {/* ── RIDER RIG ─────────────────────────────────────────────────── */}
          {/*
            The rider SVG is square (1100×1100 viewBox) but the actual
            illustration only occupies ~x:45–1056, y:99–997 of that space.
            We size the img at w-72 (288px) which gives a comfortable scale.

            Entry: from LEFT of screen → stop at CENTER.
            left-1/2 + x:-50% = true center. initial x is off the left edge.
            Bike faces RIGHT (natural SVG = direction of travel).
          */}
          <motion.div
            className="absolute bottom-[28%] left-1/2"
            initial={{ x: 'calc(-50% - 100vw)' }}
            animate={{
              // -50% centers the element on left-1/2; starts fully off LEFT edge
              x: '-50%',
              // Heavy motor stop bounce
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
              {/* Rider illustration — CSS @keyframes inside SVG handle wheel
                  spin, head nod, arm reach, bag bounce during 'ride'/'settle'.
                  We don't need to suppress them; the bag overlay simply mounts
                  on top when the flip moment arrives. */}
              {!riderSvgError ? (
                <img
                  src={getAssetUrl('/assets/rider-grouped.svg')}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-contain"
                  style={{ transform: 'scaleX(-1)' }}
                  draggable={false}
                  onError={() => setRiderSvgError(true)}
                />
              ) : (
                // CSS-only fallback so a missing /assets/rider-grouped.svg never
                // produces a blank splash. Simple, on-brand, fully animated.
                <div className="w-full h-full flex items-center justify-center">
                  <div className="relative w-40 h-40 rounded-2xl bg-[#1b1b1e] border-2 border-[#f69913]/60 shadow-xl flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-white tracking-tight uppercase">Restoran</p>
                      <p className="text-base font-black text-[#e96212] tracking-tight uppercase mt-0.5">WAWASAN</p>
                      <div className="w-10 h-[2px] bg-[#f69913] mx-auto mt-1 rounded-full" />
                      <p className="text-[9px] font-bold text-white/70 tracking-widest uppercase mt-1">Pak Usop</p>
                    </div>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-[#f69913]/60" />
                  </div>
                </div>
              )}

              {/*
                DELIVERY BAG FLIP OVERLAY
                ─────────────────────────
                Positioned to cover the bag group in the SVG.
                Bag bounding box in 1100×1100 viewBox: x=729–930, y=282–695
                As % of viewBox: left=66.3%, top=25.6%, w=18.3%, h=37.5%

                Parent rig has scaleX(-1), so the overlay's left% effectively
                becomes a right% offset. We counter-mirror it with scaleX(-1)
                on the signage text so it reads L→R for the user.

                The overlay is only mounted from 'lift' onward — before that the
                SVG's own bounceBag CSS animation plays naturally on the bag.

                Skipped entirely when riderSvgError: these coordinates and the
                counter-mirror on the signage text are both calculated against
                the real SVG's bag position and the parent rig's scaleX(-1).
                Neither is true when the CSS fallback box is showing instead.
              */}
              {showOverlay && !riderSvgError && (
                <div
                  className="absolute"
                  style={{
                    // Bag is on the RIGHT after scaleX(-1) on the img
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
                      // Snappy lift — quick and decisive
                      y: isLowEnd 
                        ? { duration: 0.3, ease: 'easeOut' }
                        : { type: 'spring', stiffness: 280, damping: 18 },
                      rotate: isLowEnd 
                        ? { duration: 0.3, ease: 'easeOut' }
                        : { type: 'spring', stiffness: 280, damping: 18 },
                      // Spring flip: overshoots past 180° slightly then settles —
                      // feels like a physical card/board being flipped, not a CSS rotate
                      rotateY: isLowEnd 
                        ? { duration: 0.45, ease: [0.4, 0, 0.2, 1], delay: 0.1 }
                        : { type: 'spring', stiffness: 120, damping: 14, delay: 0.08 },
                    }}
                  >
                    {/* Face A removed — real SVG bag shows until flip.
                        Face B: full logo only (no panel background) */}
                    <div
                      className="absolute inset-0 flex items-center justify-center overflow-visible"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      {/* Counter-mirror: parent rig is scaleX(-1) */}
                      <img
                        src={getAssetUrl('/assets/wawasan_logo_badge.png')}
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

          {/* Motion trail — visible while riding, trails to the right */}
          {isRiding && (
            <motion.div
              className="absolute bottom-[38%] flex flex-col gap-1.5"
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

          {/* Brand title + underline — fades in at hold stage */}
          <motion.div
            className="absolute bottom-[14%] left-0 right-0 text-center px-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: showTitle ? 1 : 0, y: showTitle ? 0 : 10 }}
            transition={isLowEnd 
              ? { duration: 0.4, ease: 'easeOut' }
              : { type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }
            }
          >
            <div className="flex items-center justify-center gap-1.5 text-sm font-semibold tracking-widest text-white/90 uppercase">
              <span>Restoran</span>
              <span className="text-[#e96212] font-black text-base">WAWASAN</span>
              <span className="text-[#f69913] font-bold">Pak Usop</span>
            </div>

            <div className="w-44 h-[2.5px] bg-deep-forest rounded-full mx-auto mt-2 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#e96212,#f69913)', transformOrigin: 'left' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: showTitle ? 1 : 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
              />
            </div>

            <p className="text-[10px] font-medium tracking-widest text-white/50 uppercase mt-1.5">
              Sistem Tempahan Katering
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* ── LOGO ZOOM FRAME (closing beat) ──────────────────────────────────
          Sibling — NOT nested inside the splash-bg block — so TypeScript's
          narrowing on `stage !== 'exit'` above doesn't make `stage === 'exit'`
          unreachable here. Both 'logoZoom' and 'exit' need to show this frame:
          'logoZoom' = zoom-in playing; 'exit' = zoom done, fade-out in progress.
          The parent AnimatePresence handles the fade-out (exit prop) when this
          node unmounts (when stage moves past 'exit' and component is torn down
          by App.tsx). ───────────────────────────────────────────────────── */}
      {(stage === 'logoZoom' || stage === 'exit') && (
        <motion.div
          key="logo-zoom"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-deep-forest"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <motion.img
            src={getAssetUrl('/assets/wawasan_logo_badge.png')}
            alt="Restoran Wawasan"
            className="w-60 h-60 object-contain drop-shadow-2xl"
            draggable={false}
            // add 60ms delay so the badge doesn't pop the moment hold→logoZoom fires
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            // Spring zoom: fast acceleration, overshoots to ~1.08 then
            // settles at 1.0 — the "stamp" feel. stiffness high for punch,
            // damping low enough for visible overshoot without being bouncy.
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
