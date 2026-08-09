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
// ANIMATION TIMELINE (2026-08-09 retime — spring physics pass):
//   0.00 – 1.40s  ride      : Rider enters from right, spring momentum (slight
//                             overshoot on arrival rather than a hard stop)
//   1.40 – 1.80s  settle    : Brake dip — spring dips down (~-10px) then the
//                             'lift' stage below springs it back up, giving a
//                             heavier, weighted-motorcycle feel vs a linear bounce
//   1.80 – 2.10s  lift      : Bag overlay mounts, snappy high-stiffness spring lift
//   2.10 – 2.60s  flip      : Bag face rotateY 0→180, spring (slight swing-past
//                             and settle, not a linear/eased sweep)
//   2.60 – 3.20s  hold      : Signage + title reveal finishes settling (spring on
//                             the physical y/scale motion, plain fade on opacity)
//   3.20s+        hold      : Scene holds as-is, waits for isLoading === false
//   +0.3s         logoZoom  : Full-screen badge spring-scales in from 0.2, natural
//                             spring overshoot (~1.05 peak) settling to 1.0 — the
//                             exact peak/settle time is whatever the spring
//                             physics produce, not a hand-timed keyframe
//   +0.8s         logoZoom  : "Breathe" — one soft scale pulse (1 → 1.035 → 1)
//                             once the entrance spring reports settled via
//                             onAnimationComplete, THEN the 0.8s breathe timer
//                             starts (so this is chained off real settle time,
//                             not guessed)
//   +0.5s         exit      : Parent fades to transparent (tween, not spring —
//                             see EASING PHILOSOPHY below), app content shows
//
// EASING PHILOSOPHY:
//   Physical-motion properties (x, y, rotate, rotateY, scale) use
//   `type: 'spring'` throughout this component, per request, for a more
//   "alive" feel with natural momentum/overshoot.
//   Opacity fades (scene exit, logoZoom frame exit, title fade-in) are
//   deliberately LEFT as tween/duration-based easing, not spring — a
//   spring on opacity has no physical analogue (transparency doesn't have
//   momentum) and in practice just looks like a glitchy flicker rather than
//   a bounce. This is a judgment call, not an oversight — flag if you want
//   opacity springed too and I'll wire it in, but it'll look worse.
//
// isLoading CONTRACT (preserved from AppSplashScreen.tsx):
//   Animation plays in full on its fixed timeline. At the 'hold' stage it waits
//   — it will NOT exit before isLoading becomes false. This prevents the splash
//   disappearing mid-load (blank screen flash) even on slow networks.
//   prefers-reduced-motion: skips to hold instantly, exits directly (no logoZoom).

export interface SplashScreenProps {
  isLoading: boolean;
}

type Stage = 'ride' | 'settle' | 'lift' | 'flip' | 'hold' | 'logoZoom' | 'exit';

export default function SplashScreen({ isLoading }: SplashScreenProps) {
  const [stage, setStage] = useState<Stage>('ride');
  const [badgeError, setBadgeError] = useState(false);
  // 'enter' = initial spring scale-in playing; 'breathe' = the single soft
  // pulse that plays once the entrance spring reports settled. Chained via
  // onAnimationComplete rather than a hand-guessed timeout, since spring
  // settle time isn't a fixed duration we control.
  const [logoPhase, setLogoPhase] = useState<'enter' | 'breathe'>('enter');
  // ReturnType<typeof setTimeout> — not NodeJS.Timeout (@types/node absent in this project)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reachedHoldRef = useRef(false);
  const isReducedRef = useRef(false);

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
    setLogoPhase('enter');

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
    addTimer(() => setStage('settle'),  1400);
    addTimer(() => setStage('lift'),    1800);
    addTimer(() => setStage('flip'),    2100);
    addTimer(() => {
      setStage('hold');
      reachedHoldRef.current = true;
    }, 2600);
  }, []);

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
        addTimer(() => setStage('logoZoom'), 300);
      }
    }
  }, [isLoading, stage]);

  // Fires when the logoZoom badge's entrance spring reports it has actually
  // settled (real settle time, not a guessed ms value) — plays the 0.8s
  // breathe pulse, then advances to exit. Guarded to 'enter' phase only so
  // the breathe pulse's own onAnimationComplete (which also fires once,
  // ~0.8s later) doesn't re-trigger this.
  const handleLogoEnterSettled = () => {
    if (logoPhase !== 'enter') return;
    setLogoPhase('breathe');
    addTimer(() => setStage('exit'), 800);
  };

  // Safety backup timer: if stuck on logoZoom for any reason (e.g., image loading fails,
  // onAnimationComplete doesn't fire, or framer-motion gets stuck in this environment),
  // transition to exit after 1.5 seconds to guarantee the main app starts.
  useEffect(() => {
    if (stage === 'logoZoom') {
      const timerId = setTimeout(() => {
        setStage('exit');
      }, 1500);
      return () => clearTimeout(timerId);
    }
  }, [stage]);

  // Derived booleans used across JSX
  const isRiding    = stage === 'ride';
  const showOverlay = stage === 'lift' || stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const doFlip      = stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const showTitle   = stage === 'hold' || stage === 'logoZoom' || stage === 'exit';

  return (
    <AnimatePresence>
      {/* ── MAIN SPLASH SCENE (rider + title) ──────────────────────────────── */}
      {stage !== 'exit' && stage !== 'logoZoom' && (
        <motion.div
          key="splash-bg"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#151714] overflow-hidden select-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Subtle batik-style dot background */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.1]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="sp-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2"  cy="2"  r="1.2" fill="#B4FF39" />
                  <circle cx="14" cy="14" r="1.2" fill="#FF6A1A" />
                  <circle cx="14" cy="2"  r="0.7" fill="#ffffff" />
                  <circle cx="2"  cy="14" r="0.7" fill="#ffffff" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sp-dots)" />
            </svg>
          </div>

          {/* Ground line */}
          <div className="absolute bottom-[30%] left-8 right-8 h-px bg-white/10" />

          {/* ── RIDER RIG ─────────────────────────────────────────────────── */}
          {/*
            The rider SVG is square (1100×1100 viewBox) but the actual
            illustration only occupies ~x:45–1056, y:99–997 of that space.
            We size the img at w-72 (288px) which gives a comfortable scale.

            Entry: x starts at 110vw (fully off-screen right). On desktop the
            rider is wider so we use a generous starting offset. On mobile
            110vw is sufficient. Landing x is -50% (centering via translateX).

            scaleX(-1) mirrors the whole rig so the motorcycle faces LEFT
            (its natural drawn direction is right-facing). The bag overlay
            below compensates for this mirror with its own scaleX(-1).
          */}
          <motion.div
            className="absolute bottom-[28%]"
            style={{ translateX: '-50%', left: '50%' }}
            initial={{ x: '110vw' }}
            animate={{
              x: 0,
              // Dips down on the brake ('settle'), springs back up once
              // weight has settled ('lift' onward) — the dip+recover pair
              // across these two real stage transitions is what sells the
              // "heavier motorcycle" feel, rather than a single 3-point
              // keyframe tween.
              y: stage === 'settle' ? -10 : 0,
            }}
            transition={{
              // Slightly underdamped: gives the arrival a touch of momentum
              // overshoot instead of a hard stop.
              x: { type: 'spring', stiffness: 95, damping: 14, mass: 1 },
              y: { type: 'spring', stiffness: 260, damping: 20, mass: 0.9 },
            }}
          >
            <div className="relative w-72 h-72" style={{ transform: 'scaleX(-1)' }}>
              {/* Rider illustration — CSS @keyframes inside SVG handle wheel
                  spin, head nod, arm reach, bag bounce during 'ride'/'settle'.
                  We don't need to suppress them; the bag overlay simply mounts
                  on top when the flip moment arrives. */}
              <img
                src={getAssetUrl('/assets/rider-grouped.svg')}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain"
                draggable={false}
                referrerPolicy="no-referrer"
              />

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
              */}
              {showOverlay && (
                <div
                  className="absolute"
                  style={{
                    left: '66.3%',
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
                      // Snappy: high stiffness, low damping mass — pops up fast
                      // with minimal settle wobble.
                      y:       { type: 'spring', stiffness: 480, damping: 24 },
                      rotate:  { type: 'spring', stiffness: 480, damping: 24 },
                      // Springier: lower stiffness lets it swing slightly past
                      // 180deg before settling, like a lid with real hinge weight.
                      rotateY: { type: 'spring', stiffness: 170, damping: 15, delay: 0.1 },
                    }}
                  >
                    {/* Face A — plain bag (matches SVG bag appearance) */}
                    <div
                      className="absolute inset-0 rounded-lg bg-[#2d3436] border-2 border-[#B4FF39]/60 flex items-center justify-center"
                      style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    >
                      <div className="w-4/5 h-0.5 bg-[#B4FF39]/50 rounded-full" />
                    </div>

                    {/* Face B — Wawasan signage revealed after flip */}
                    <div
                      className="absolute inset-0 rounded-lg bg-[#FF6A1A] border-2 border-[#B4FF39] flex flex-col items-center justify-center gap-0.5 px-1 shadow-xl"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      {/* Counter-mirror: parent rig is scaleX(-1), so text
                          needs another scaleX(-1) to read normally */}
                      <div style={{ transform: 'scaleX(-1)', textAlign: 'center' }}>
                        <span className="block text-[7px] font-black text-white leading-none tracking-tight uppercase">
                          WAWASAN
                        </span>
                        <span className="block text-[5px] font-bold text-[#151714] leading-none uppercase mt-0.5">
                          Est. 1986
                        </span>
                      </div>
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
              style={{ left: '55%' }}
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
            transition={{
              y: { type: 'spring', stiffness: 260, damping: 20 },
              opacity: { duration: 0.4, ease: 'easeOut' },
            }}
          >
            <div className="flex items-center justify-center gap-1.5 text-sm font-semibold tracking-widest text-white/90 uppercase">
              <span>Restoran</span>
              <span className="text-[#FF6A1A] font-black text-base">WAWASAN</span>
              <span className="text-[#B4FF39] font-bold">Pak Usop</span>
            </div>

            <div className="w-44 h-[2.5px] bg-[#1F2320] rounded-full mx-auto mt-2 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#FF6A1A,#B4FF39)', transformOrigin: 'left' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: showTitle ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.15 }}
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
          unreachable here. 'logoZoom' shows this frame, and once we transition
          to 'exit' it will unmount, allowing AnimatePresence to trigger the
          fade-out transition. ───────────────────────────────────────────── */}
      {stage === 'logoZoom' && (
        <motion.div
          key="logo-zoom"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#151714]"
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
            referrerPolicy="no-referrer"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={
              logoPhase === 'enter'
                ? { scale: 1, opacity: 1 }
                : { scale: [1, 1.035, 1], opacity: 1 }
            }
            transition={
              logoPhase === 'enter'
                ? {
                    // Underdamped spring: naturally overshoots to roughly
                    // ~1.05 before settling at 1.0 — the exact peak is
                    // whatever these physics produce, not a hand-set keyframe.
                    scale: { type: 'spring', stiffness: 260, damping: 15, mass: 0.9 },
                    opacity: { duration: 0.25, ease: 'easeOut' },
                  }
                : { duration: 0.8, ease: 'easeInOut' }
            }
            onAnimationComplete={handleLogoEnterSettled}
            onError={() => setBadgeError(true)}
            style={badgeError ? { display: 'none' } : {}}
          />
          {badgeError && (
            <div className="text-center">
              <p className="text-2xl font-black text-[#FF6A1A] tracking-tight">RESTORAN</p>
              <p className="text-3xl font-black text-white tracking-tight">WAWASAN</p>
              <p className="text-sm text-[#B4FF39] font-semibold tracking-widest uppercase mt-1">Est. 1986</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
