import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

// F-SPLASH (2026-08-09 audit): this component replaces AppSplashScreen.tsx as
// the app's loading screen — a delivery-rider illustration rides in from the
// right, and the parcel box on the back flips to reveal Wawasan signage.
//
// Behavior contract with App.tsx (must stay isLoading-driven, not a fixed
// timer only):
//   - The ride/settle/lift/flip animation always plays in full on a fixed
//     timeline (this is a deliberate brand moment, not a progress indicator).
//   - Once the animation reaches the 'hold' stage (signage revealed), it
//     WAITS there instead of auto-exiting. It only proceeds to fade out once
//     `isLoading` becomes false.
//   - This preserves the safety behavior that AppSplashScreen previously
//     had (never disappearing before the app is actually ready), while still
//     guaranteeing the reveal moment is never cut short if the app becomes
//     ready very quickly (e.g. warm cache, fast network).
//   - If prefers-reduced-motion is set, skip straight to the signage/title
//     frame and exit as soon as isLoading is false (no decorative delay).
//   - Theme Aware: Observes theme from ThemeContext to adapt background, batik
//     dots, rider accents, and typography seamlessly between light and dark modes.

export interface SplashScreenProps {
  isLoading: boolean;
}

type Stage = 'ride' | 'settle' | 'lift' | 'flip' | 'hold' | 'logoZoom' | 'exit';

export default function SplashScreen({ isLoading }: SplashScreenProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [stage, setStage] = useState<Stage>('ride');
  const [logoError, setLogoError] = useState(false);
  // Browser/DOM timer IDs, not Node's — this project has no @types/node
  // dependency, so `NodeJS.Timeout` does not resolve and fails
  // `tsc --noEmit`. ReturnType<typeof setTimeout> is the correct browser type.
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reachedHoldRef = useRef(false);
  // Reduced-motion sessions skip the decorative logoZoom stage entirely
  // (straight hold -> exit), so the gating effect needs to know which
  // path it's on.
  const isReducedRef = useRef(false);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const addTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  };

  // Runs once on mount to drive the ride -> settle -> lift -> flip -> hold
  // sequence. Does NOT schedule the exit — exit is driven by the isLoading
  // effect below, so the splash never disappears before the app signals it
  // is actually ready.
  const startAnimationSequence = useCallback(() => {
    clearAllTimeouts();
    reachedHoldRef.current = false;

    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isReduced) {
      isReducedRef.current = true;
      setStage('hold');
      reachedHoldRef.current = true;
      return;
    }
    isReducedRef.current = false;

    // Standard Animation Timeline:
    // 0.00 - 1.10s : ride     (enter from right to center)
    // 1.10 - 1.35s : settle   (gentle braking bounce)
    // 1.35 - 1.50s : lift     (box lifts slightly and tilts)
    // 1.50 - 1.70s : flip     (3D rotateY 180deg to reveal signage)
    // 1.70s+       : hold     (brand title & underline reveal, waits for isLoading)
    // once ready   : logoZoom (full-screen logo zoom-in, fixed ~450ms)
    // then         : exit     (fade out, handled by AnimatePresence)
    setStage('ride');
    addTimeout(() => setStage('settle'), 1100);
    addTimeout(() => setStage('lift'), 1350);
    addTimeout(() => setStage('flip'), 1500);
    addTimeout(() => {
      setStage('hold');
      reachedHoldRef.current = true;
    }, 1700);
  }, []);

  useEffect(() => {
    startAnimationSequence();
    return () => clearAllTimeouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exit is gated on both conditions: the app must be done loading AND the
  // reveal animation must have reached the hold frame at least once. If
  // isLoading turns false while still mid-ride (very fast load), this
  // effect will simply re-check on the next stage change rather than
  // cutting the animation short.
  useEffect(() => {
    if (!isLoading && reachedHoldRef.current && stage === 'hold') {
      if (isReducedRef.current) {
        addTimeout(() => setStage('exit'), 300);
      } else {
        addTimeout(() => setStage('logoZoom'), 300);
      }
    }
  }, [isLoading, stage]);

  // logoZoom is a fixed-duration decorative beat, not gated on anything —
  // once entered it always advances to exit on its own after 450ms.
  useEffect(() => {
    if (stage === 'logoZoom') {
      addTimeout(() => setStage('exit'), 450);
    }
  }, [stage]);

  const isLiftOrLater = stage === 'lift' || stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const isFlipped = stage === 'flip' || stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  const isHoldOrLater = stage === 'hold' || stage === 'logoZoom' || stage === 'exit';
  // Wheels spin only during the active 'ride' stage; animate={false} (rather
  // than animating rotate back to a literal 0) lets Framer Motion hold the
  // wheel at whatever angle it stopped at instead of snapping backwards.
  const isRiding = stage === 'ride';

  // Dynamic Theme Palette Values
  const accentSecondary = isDark ? '#B4FF39' : '#658216';
  const groundGlow = isDark ? 'via-[#B4FF39]/40' : 'via-[#FF6A1A]/40';
  const textTitleSecondary = isDark ? 'text-[#B4FF39]' : 'text-[#658216]';

  return (
    <AnimatePresence>
      {stage !== 'exit' && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden font-sans transition-colors duration-300 ${
            isDark ? 'bg-[#151714] text-white' : 'bg-[#FAF8F5] text-[#151714]'
          }`}
        >
          {/* Subtle Batik Dot Background Pattern */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="batik-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill={accentSecondary} />
                  <circle cx="14" cy="14" r="1.5" fill="#FF6A1A" />
                  <circle cx="14" cy="2" r="0.75" fill={isDark ? '#FFFFFF' : '#151714'} />
                  <circle cx="2" cy="14" r="0.75" fill={isDark ? '#FFFFFF' : '#151714'} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#batik-dots)" />
            </svg>
          </div>

          {/* Main Stage Container */}
          <div className="relative w-full max-w-sm h-80 flex flex-col items-center justify-center px-4">

            {/* Ground / Stage Line */}
            <div className={`absolute bottom-20 left-4 right-4 h-[1.5px] rounded-full ${isDark ? 'bg-white/10' : 'bg-[#151714]/15'}`}>
              <div className={`absolute inset-x-12 top-0 h-[2px] bg-gradient-to-r from-transparent ${groundGlow} to-transparent`} />
            </div>

            {/* Motorcycle + Rider Rig Container */}
            {/*
              Mirror Logic:
              The base SVG vector illustration is drawn facing right (+X).
              Applying scaleX(-1) mirrors the entire rig horizontally so the
              motorcycle faces LEFT, matching its direction of travel from
              the right side of the screen to center.
            */}
            <motion.div
              className="absolute bottom-20 flex items-center justify-center"
              initial={{ x: '320%' }}
              animate={{
                x: '0%',
                y: stage === 'settle' ? [0, -6, 0] : 0,
              }}
              transition={{
                x: { duration: 1.1, ease: [0.22, 1, 0.36, 1] }, // braking deceleration curve
                y: { duration: 0.25, ease: 'easeOut' },
              }}
              style={{ transform: 'scaleX(-1)' }}
            >
              {/* Motion Trail Lines (visible during ride phase) */}
              {stage === 'ride' && (
                <div className="absolute -right-16 top-6 flex flex-col gap-2 pointer-events-none opacity-80">
                  <motion.div
                    className="w-12 h-[2px] rounded-full"
                    style={{ backgroundColor: accentSecondary }}
                    animate={{ opacity: [0.3, 1, 0.3], x: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 0.15 }}
                  />
                  <motion.div
                    className="w-16 h-[2px] bg-[#FF6A1A] rounded-full"
                    animate={{ opacity: [0.4, 0.9, 0.4], x: [0, 12, 0] }}
                    transition={{ repeat: Infinity, duration: 0.18 }}
                  />
                  <motion.div
                    className="w-8 h-[2px] rounded-full"
                    style={{ backgroundColor: accentSecondary }}
                    animate={{ opacity: [0.2, 0.8, 0.2], x: [0, 6, 0] }}
                    transition={{ repeat: Infinity, duration: 0.12 }}
                  />
                </div>
              )}

              {/* Motorcycle + Rider SVG Graphic */}
              <div className="relative w-64 h-36">
                <svg viewBox="0 0 240 140" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Headlight Beam Glow (facing left in mirrored view) */}
                  <polygon points="178,56 240,35 240,80" fill={accentSecondary} opacity="0.25" />

                  {/* Rear Wheel */}
                  <g transform="translate(50, 100)">
                    <motion.g
                      animate={isRiding ? { rotate: [0, -1080] } : false}
                      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <circle cx="0" cy="0" r="22" fill={isDark ? '#151714' : '#1F2320'} stroke={isDark ? '#1F2320' : '#333832'} strokeWidth="4" />
                      <circle cx="0" cy="0" r="16" stroke={isDark ? '#2b2f2a' : '#42483E'} strokeWidth="2" fill="none" />
                      <line x1="-16" y1="0" x2="16" y2="0" stroke={accentSecondary} strokeWidth="1.5" />
                      <line x1="0" y1="-16" x2="0" y2="16" stroke={accentSecondary} strokeWidth="1.5" />
                      <line x1="-11" y1="-11" x2="11" y2="11" stroke={accentSecondary} strokeWidth="1.5" />
                      <line x1="-11" y1="11" x2="11" y2="-11" stroke={accentSecondary} strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="5" fill="#FF6A1A" />
                    </motion.g>
                  </g>

                  {/* Front Wheel */}
                  <g transform="translate(180, 100)">
                    <motion.g
                      animate={isRiding ? { rotate: [0, -1080] } : false}
                      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <circle cx="0" cy="0" r="22" fill={isDark ? '#151714' : '#1F2320'} stroke={isDark ? '#1F2320' : '#333832'} strokeWidth="4" />
                      <circle cx="0" cy="0" r="16" stroke={isDark ? '#2b2f2a' : '#42483E'} strokeWidth="2" fill="none" />
                      <line x1="-16" y1="0" x2="16" y2="0" stroke={accentSecondary} strokeWidth="1.5" />
                      <line x1="0" y1="-16" x2="0" y2="16" stroke={accentSecondary} strokeWidth="1.5" />
                      <line x1="-11" y1="-11" x2="11" y2="11" stroke={accentSecondary} strokeWidth="1.5" />
                      <line x1="-11" y1="11" x2="11" y2="-11" stroke={accentSecondary} strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="5" fill="#FF6A1A" />
                    </motion.g>
                  </g>

                  {/* Motorcycle Frame & Chassis */}
                  <path
                    d="M50,100 L110,95 L155,60 L180,100 M110,95 L145,95 M50,100 L75,70"
                    stroke="#1F2320"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M95,100 L135,102 L160,98" stroke="#2b2f2a" strokeWidth="3.5" strokeLinecap="round" />

                  {/* Orange Fairing / Body Shell */}
                  <path d="M100,72 Q130,62 155,58 L168,78 Q130,88 105,82 Z" fill="#FF6A1A" />
                  <path d="M160,88 Q180,72 200,88" stroke="#FF6A1A" strokeWidth="4" fill="none" strokeLinecap="round" />

                  {/* Handlebars & Front Fork */}
                  <line x1="180" y1="100" x2="165" y2="52" stroke="#1F2320" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M162,52 L172,50" stroke="#151714" strokeWidth="4" strokeLinecap="round" />

                  {/* Headlight */}
                  <circle cx="176" cy="56" r="5" fill={accentSecondary} />

                  {/* Seat (Charcoal) */}
                  <path d="M70,68 C80,66 100,66 112,72 C105,78 85,78 70,74 Z" fill="#1F2320" />

                  {/* Luggage Rack Base (Back of Motorcycle) */}
                  <rect x="25" y="66" width="38" height="4" fill="#1F2320" rx="1" />
                  <line x1="30" y1="70" x2="45" y2="95" stroke="#1F2320" strokeWidth="3" />

                  {/* RIDER (Sitting on bike, leaning slightly forward) */}
                  <path
                    d="M85,70 L105,88 L122,90"
                    stroke="#1F2320"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M120,90 L130,90" stroke="#151714" strokeWidth="4" strokeLinecap="round" />

                  <path d="M80,68 L108,42 L132,58 L102,74 Z" fill="#1F2320" />
                  <path d="M92,56 L118,48" stroke={accentSecondary} strokeWidth="3.5" strokeLinecap="round" />

                  <path
                    d="M108,46 L138,52 L165,52"
                    stroke="#1F2320"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <circle cx="116" cy="30" r="14" fill="#FF6A1A" />
                  <path d="M122,24 C128,24 130,32 124,35 Z" fill={accentSecondary} />
                  <path d="M104,28 Q116,20 126,24" stroke="#FFFFFF" strokeWidth="2" fill="none" />
                </svg>

                {/*
                  3D DELIVERY BOX (Mounted on the rear luggage rack)
                  - Initial: dark/neutral box (#2b2f2a in dark, #E5E0D8 in light) with secondary accent border.
                  - Lift: -10px, rotate -8deg.
                  - Flip: rotateY 0 -> 180deg over 0.4s.
                  - Revealed face: real Wawasan logo on an orange signage card.
                  - Counter-mirrored (scaleX(-1)) so the logo/label reads
                    correctly despite the parent rig's scaleX(-1) mirror.
                */}
                <div
                  className="absolute left-[18px] top-[18px] w-[50px] h-[40px] z-20 pointer-events-none"
                  style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
                >
                  <motion.div
                    className="w-full h-full relative"
                    style={{ transformStyle: 'preserve-3d', transformOrigin: 'center center' }}
                    animate={{
                      y: isLiftOrLater ? -10 : 0,
                      rotate: isLiftOrLater ? -8 : 0,
                      rotateY: isFlipped ? 180 : 0,
                    }}
                    transition={{
                      y: { duration: 0.35, ease: 'easeOut' },
                      rotate: { duration: 0.35, ease: 'easeOut' },
                      rotateY: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                    }}
                  >
                    {/* BACK FACE (Initial Plain Delivery Box) */}
                    <div
                      className={`absolute inset-0 rounded-md border-2 flex flex-col items-center justify-center p-1 shadow-md ${
                        isDark ? 'bg-[#2b2f2a] border-[#B4FF39]' : 'bg-[#EAE5DD] border-[#FF6A1A]'
                      }`}
                      style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
                    >
                      <div className="w-full h-1 rounded-sm mb-1 opacity-60" style={{ backgroundColor: isDark ? '#B4FF39' : '#FF6A1A' }} />
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${isDark ? 'border-[#B4FF39]/60 bg-[#1F2320]' : 'border-[#FF6A1A]/60 bg-[#FAF8F5]'}`}>
                        <div className="w-2 h-2 rounded-xs" style={{ backgroundColor: isDark ? '#B4FF39' : '#FF6A1A' }} />
                      </div>
                    </div>

                    {/* FRONT FACE (Revealed Signage Face — real logo) */}
                    <div
                      className="absolute inset-0 rounded-md bg-[#FF6A1A] border-2 border-[#B4FF39] flex flex-col items-center justify-center p-0.5 shadow-xl overflow-hidden"
                      style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <div
                        className="flex items-center justify-center w-full h-full"
                        style={{ transform: 'scaleX(-1)' }}
                      >
                        {logoError ? (
                          <span className="text-[7px] font-black tracking-tighter text-white leading-none uppercase text-center px-0.5">
                            WAWASAN
                          </span>
                        ) : (
                          <img
                            src={getAssetUrl('/assets/wawasan_logo.svg')}
                            alt="Restoran Wawasan"
                            className="w-full h-full object-contain p-0.5"
                            onError={() => setLogoError(true)}
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Bottom Brand Title & Underline (Reveals during 'hold' stage) */}
            <motion.div
              className="absolute bottom-2 flex flex-col items-center justify-center text-center w-full px-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: isHoldOrLater ? 1 : 0,
                y: isHoldOrLater ? 0 : 12,
              }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <div className={`flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase ${
                isDark ? 'text-white/90' : 'text-[#151714]/90'
              }`}>
                <span>Restoran</span>
                <span className="text-[#FF6A1A] font-black text-sm">WAWASAN</span>
                <span className={`font-bold text-xs ${textTitleSecondary}`}>Pak Usop</span>
              </div>

              <div className={`w-48 h-[3px] rounded-full mt-1.5 overflow-hidden ${
                isDark ? 'bg-[#1F2320]' : 'bg-[#E5E0D8]'
              }`}>
                <motion.div
                  className="w-full h-full bg-gradient-to-r from-[#FF6A1A] via-[#FF6A1A] to-[#B4FF39] rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isHoldOrLater ? 1 : 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                  style={{ transformOrigin: 'left' }}
                />
              </div>

              <p className={`text-[10px] font-medium tracking-wider uppercase mt-1 ${
                isDark ? 'text-white/70' : 'text-[#151714]/70'
              }`}>
                Sistem Tempahan Katering
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/*
        Full-screen logo zoom climax (2026-08-09).
        Deliberately a SIBLING of the scene above, not nested inside it —
        nesting it inside the `stage !== 'exit'` block previously caused a
        TypeScript "this comparison is unintentional" error on
        `stage === 'exit'` (TS had already narrowed `stage` to exclude
        'exit' inside that block), and even after working around the
        type error, that structure meant this overlay would stay mounted
        forever once `stage` reached 'exit' (its own condition would have
        included 'exit', which never changes again). As a sibling with its
        own `stage === 'logoZoom'`-only guard, AnimatePresence plays this
        element's `exit` animation and then removes it the moment `stage`
        advances to 'exit' — it does not linger over the app afterward.
      */}
      {stage === 'logoZoom' && (
        <motion.div
          key="logo-zoom-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`fixed inset-0 z-[10000] flex items-center justify-center select-none ${
            isDark ? 'bg-[#151714]' : 'bg-[#FAF8F5]'
          }`}
        >
          {logoError ? (
            <span className="text-2xl font-black tracking-tighter uppercase">
              WAWASAN
            </span>
          ) : (
            <motion.img
              src={getAssetUrl('/assets/wawasan_badge.png')}
              alt="Restoran Wawasan Est. 1986"
              className="w-56 h-auto max-w-[80vw] object-contain"
              initial={{ scale: 0.55 }}
              animate={{ scale: 1.1 }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              onError={() => setLogoError(true)}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

