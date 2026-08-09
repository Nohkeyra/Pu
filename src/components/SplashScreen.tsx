import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

export interface SplashScreenProps {
  isLoading: boolean;
}

type Stage =
  | 'ride'
  | 'settle'
  | 'dismount'
  | 'reach'
  | 'grab'
  | 'windup'
  | 'throw'
  | 'impact'
  | 'hold'
  | 'logoZoom'
  | 'exit';

const isAtLeast = (stage: Stage, stages: Stage[]) => stages.includes(stage);

export default function SplashScreen({ isLoading }: SplashScreenProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [stage, setStage] = useState<Stage>('ride');
  const [logoError, setLogoError] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reachedHoldRef = useRef(false);
  const reducedMotionRef = useRef(false);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const addTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  }, []);

  const startSequence = useCallback(() => {
    clearAllTimeouts();
    reachedHoldRef.current = false;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    reducedMotionRef.current = reduced;

    if (reduced) {
      setStage('hold');
      reachedHoldRef.current = true;
      return;
    }

    /*
     * Brand choreography:
     * 0.00–1.10  ride in
     * 1.10–1.42  brake / settle
     * 1.42–1.90  rider dismounts
     * 1.90–2.30  rider reaches for the badge
     * 2.30–2.58  badge is lifted from the box
     * 2.58–2.92  throwing wind-up
     * 2.92–3.48  badge is physically thrown toward the phone screen
     * 3.48–3.70  impact / full-screen hold
     *
     * Exit is still gated by isLoading.
     */
    setStage('ride');
    addTimeout(() => setStage('settle'), 1100);
    addTimeout(() => setStage('dismount'), 1420);
    addTimeout(() => setStage('reach'), 1900);
    addTimeout(() => setStage('grab'), 2300);
    addTimeout(() => setStage('windup'), 2580);
    addTimeout(() => setStage('throw'), 2920);
    addTimeout(() => {
      setStage('impact');
      addTimeout(() => {
        setStage('hold');
        reachedHoldRef.current = true;
      }, 220);
    }, 3480);
  }, [addTimeout, clearAllTimeouts]);

  useEffect(() => {
    startSequence();
    return clearAllTimeouts;
  }, [startSequence, clearAllTimeouts]);

  useEffect(() => {
    if (!isLoading && reachedHoldRef.current && stage === 'hold') {
      addTimeout(
        () => setStage(reducedMotionRef.current ? 'exit' : 'logoZoom'),
        reducedMotionRef.current ? 250 : 180
      );
    }
  }, [isLoading, stage, addTimeout]);

  useEffect(() => {
    if (stage === 'logoZoom') {
      addTimeout(() => setStage('exit'), 420);
    }
  }, [stage, addTimeout]);

  const accent = isDark ? '#B4FF39' : '#658216';
  const groundGlow = isDark ? 'via-[#B4FF39]/40' : 'via-[#FF6A1A]/40';
  const secondaryText = isDark ? 'text-[#B4FF39]' : 'text-[#658216]';

  const riding = stage === 'ride';
  const dismounted = isAtLeast(stage, ['dismount', 'reach', 'grab', 'windup', 'throw', 'impact', 'hold', 'logoZoom', 'exit']);
  const reaching = isAtLeast(stage, ['reach', 'grab']);
  const holdingBadge = isAtLeast(stage, ['grab', 'windup']);
  const throwing = stage === 'throw' || stage === 'impact' || stage === 'hold' || stage === 'logoZoom';
  const sceneVisible = stage !== 'exit';

  return (
    <AnimatePresence>
      {sceneVisible && (
        <motion.div
          key="splash-scene"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.48, ease: 'easeInOut' }}
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none font-sans ${
            isDark ? 'bg-[#151714] text-white' : 'bg-[#FAF8F5] text-[#151714]'
          }`}
        >
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="wawasan-batik-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill={accent} />
                  <circle cx="14" cy="14" r="1.5" fill="#FF6A1A" />
                  <circle cx="14" cy="2" r="0.75" fill={isDark ? '#FFFFFF' : '#151714'} />
                  <circle cx="2" cy="14" r="0.75" fill={isDark ? '#FFFFFF' : '#151714'} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#wawasan-batik-dots)" />
            </svg>
          </div>

          <div className="relative h-80 w-full max-w-sm px-4">
            <div className={`absolute bottom-20 left-4 right-4 h-[1.5px] rounded-full ${isDark ? 'bg-white/10' : 'bg-[#151714]/15'}`}>
              <div className={`absolute inset-x-12 top-0 h-[2px] bg-gradient-to-r from-transparent ${groundGlow} to-transparent`} />
            </div>

            {/* Motorcycle remains grounded while the rider is animated independently. */}
            <motion.div
              className="absolute bottom-20 left-1/2 flex h-36 w-64 -translate-x-1/2 items-center justify-center"
              initial={{ x: '220%' }}
              animate={{
                x: '0%',
                y: stage === 'settle' ? [0, -5, 0] : 0,
              }}
              transition={{
                x: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
                y: { duration: 0.32, ease: 'easeOut' },
              }}
              style={{ scaleX: -1 }}
            >
              {riding && (
                <div className="absolute -right-16 top-6 flex flex-col gap-2 opacity-80">
                  <motion.div
                    className="h-[2px] w-12 rounded-full"
                    style={{ backgroundColor: accent }}
                    animate={{ opacity: [0.25, 1, 0.25], x: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 0.15 }}
                  />
                  <motion.div
                    className="h-[2px] w-16 rounded-full bg-[#FF6A1A]"
                    animate={{ opacity: [0.3, 0.9, 0.3], x: [0, 12, 0] }}
                    transition={{ repeat: Infinity, duration: 0.18 }}
                  />
                </div>
              )}

              <svg viewBox="0 0 240 140" className="h-full w-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Bike */}
                <polygon points="178,56 240,35 240,80" fill={accent} opacity="0.22" />

                <g transform="translate(50,100)">
                  <motion.g
                    animate={riding ? { rotate: [0, -1080] } : false}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <circle r="22" fill={isDark ? '#151714' : '#1F2320'} stroke={isDark ? '#1F2320' : '#333832'} strokeWidth="4" />
                    <circle r="16" stroke={isDark ? '#2b2f2a' : '#42483E'} strokeWidth="2" />
                    <line x1="-16" y1="0" x2="16" y2="0" stroke={accent} strokeWidth="1.5" />
                    <line x1="0" y1="-16" x2="0" y2="16" stroke={accent} strokeWidth="1.5" />
                    <line x1="-11" y1="-11" x2="11" y2="11" stroke={accent} strokeWidth="1.5" />
                    <line x1="-11" y1="11" x2="11" y2="-11" stroke={accent} strokeWidth="1.5" />
                    <circle r="5" fill="#FF6A1A" />
                  </motion.g>
                </g>

                <g transform="translate(180,100)">
                  <motion.g
                    animate={riding ? { rotate: [0, -1080] } : false}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <circle r="22" fill={isDark ? '#151714' : '#1F2320'} stroke={isDark ? '#1F2320' : '#333832'} strokeWidth="4" />
                    <circle r="16" stroke={isDark ? '#2b2f2a' : '#42483E'} strokeWidth="2" />
                    <line x1="-16" y1="0" x2="16" y2="0" stroke={accent} strokeWidth="1.5" />
                    <line x1="0" y1="-16" x2="0" y2="16" stroke={accent} strokeWidth="1.5" />
                    <line x1="-11" y1="-11" x2="11" y2="11" stroke={accent} strokeWidth="1.5" />
                    <line x1="-11" y1="11" x2="11" y2="-11" stroke={accent} strokeWidth="1.5" />
                    <circle r="5" fill="#FF6A1A" />
                  </motion.g>
                </g>

                <path d="M50,100 L110,95 L155,60 L180,100 M110,95 L145,95 M50,100 L75,70" stroke="#1F2320" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M95,100 L135,102 L160,98" stroke="#2b2f2a" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M100,72 Q130,62 155,58 L168,78 Q130,88 105,82 Z" fill="#FF6A1A" />
                <path d="M160,88 Q180,72 200,88" stroke="#FF6A1A" strokeWidth="4" strokeLinecap="round" />
                <line x1="180" y1="100" x2="165" y2="52" stroke="#1F2320" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M162,52 L172,50" stroke="#151714" strokeWidth="4" strokeLinecap="round" />
                <circle cx="176" cy="56" r="5" fill={accent} />
                <path d="M70,68 C80,66 100,66 112,72 C105,78 85,78 70,74 Z" fill="#1F2320" />
                <rect x="25" y="66" width="38" height="4" rx="1" fill="#1F2320" />
                <line x1="30" y1="70" x2="45" y2="95" stroke="#1F2320" strokeWidth="3" />

                {/* Delivery box: physically stays on the bike until the rider grabs it. */}
                <motion.g
                  animate={{
                    y: stage === 'grab' || stage === 'windup' ? -4 : 0,
                    rotate: stage === 'grab' ? -3 : 0,
                    opacity: throwing ? 0.35 : 1,
                  }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <rect x="25" y="48" width="38" height="22" rx="3" fill={isDark ? '#2b2f2a' : '#EAE5DD'} stroke={isDark ? accent : '#FF6A1A'} strokeWidth="2" />
                  <rect x="29" y="52" width="30" height="4" rx="1" fill={isDark ? accent : '#FF6A1A'} opacity="0.7" />
                  <rect x="36" y="59" width="14" height="7" rx="1.5" fill={isDark ? '#1F2320' : '#FAF8F5'} />
                  <circle cx="43" cy="62.5" r="2" fill="#FF6A1A" />
                </motion.g>

                {/* Rider rig. This is deliberately separated from the motorcycle. */}
                <motion.g
                  animate={{
                    x: dismounted ? 8 : 0,
                    y: dismounted ? 18 : 0,
                    rotate: dismounted ? -3 : 0,
                  }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
                >
                  {/* Rear leg leaves the saddle and plants on the ground. */}
                  <motion.path
                    d="M86,72 L76,88 L67,104"
                    stroke="#1F2320"
                    strokeWidth="7"
                    strokeLinecap="round"
                    animate={{
                      d: dismounted
                        ? 'M86,72 L80,91 L78,106'
                        : 'M86,72 L76,88 L67,104',
                    }}
                    transition={{ duration: 0.38, ease: 'easeOut' }}
                  />
                  <motion.path
                    d="M67,104 L58,104"
                    stroke="#151714"
                    strokeWidth="4"
                    strokeLinecap="round"
                    animate={{ x: dismounted ? 7 : 0 }}
                    transition={{ duration: 0.38 }}
                  />

                  {/* Torso */}
                  <path d="M80,68 L108,42 L132,58 L102,74 Z" fill="#1F2320" />
                  <path d="M92,56 L118,48" stroke={accent} strokeWidth="3.5" strokeLinecap="round" />

                  {/* Arm nearest the parcel. It reaches, grabs, then winds back. */}
                  <motion.path
                    d="M108,46 L138,52 L165,52"
                    stroke="#1F2320"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={{
                      d: reaching
                        ? 'M106,48 L78,57 L58,57'
                        : stage === 'windup' || throwing
                          ? 'M106,48 L129,38 L145,27'
                          : 'M108,46 L138,52 L165,52',
                    }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  />

                  {/* Hand */}
                  <motion.circle
                    cx="165"
                    cy="52"
                    r="4"
                    fill="#FF6A1A"
                    animate={{
                      cx: reaching ? 55 : stage === 'windup' || throwing ? 149 : 165,
                      cy: reaching ? 57 : stage === 'windup' || throwing ? 24 : 52,
                    }}
                    transition={{ duration: 0.34, ease: 'easeOut' }}
                  />

                  {/* Far arm remains on the rider body for silhouette stability. */}
                  <path d="M98,51 L121,61 L142,65" stroke="#151714" strokeWidth="5" strokeLinecap="round" />

                  {/* Head / helmet */}
                  <motion.g
                    animate={{
                      x: reaching ? -3 : stage === 'windup' || throwing ? 2 : 0,
                      y: reaching ? 3 : stage === 'windup' || throwing ? -2 : 0,
                      rotate: reaching ? -6 : stage === 'windup' || throwing ? 8 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <circle cx="116" cy="30" r="14" fill="#FF6A1A" />
                    <path d="M122,24 C128,24 130,32 124,35 Z" fill={accent} />
                    <path d="M104,28 Q116,20 126,24" stroke="#FFFFFF" strokeWidth="2" />
                  </motion.g>
                </motion.g>
              </svg>
            </motion.div>

            {/* Badge leaves the rider's hand, not a separate centre-screen spawn. */}
            {!reducedMotionRef.current && !['ride', 'settle', 'dismount', 'reach', 'grab', 'windup'].includes(stage) && (
              <motion.div
                className="pointer-events-none absolute z-40"
                initial={{ left: '62%', top: '42%', x: '-50%', y: '-50%', scale: 0.34, rotate: -8, opacity: 0 }}
                animate={
                  stage === 'throw'
                    ? {
                        left: '50%',
                        top: '50%',
                        x: '-50%',
                        y: '-50%',
                        scale: 3.7,
                        rotate: 10,
                        opacity: 1,
                      }
                    : {
                        left: '50%',
                        top: '50%',
                        x: '-50%',
                        y: '-50%',
                        scale: 7.8,
                        rotate: 0,
                        opacity: stage === 'impact' ? 1 : 0.98,
                      }
                }
                transition={{
                  duration: stage === 'throw' ? 0.56 : 0.22,
                  ease: stage === 'throw' ? [0.16, 1, 0.3, 1] : [0.22, 1, 0.36, 1],
                }}
              >
                <motion.img
                  src={getAssetUrl('/assets/wawasan_badge.png')}
                  alt=""
                  className="h-auto w-28 object-contain drop-shadow-2xl"
                  animate={{
                    filter:
                      stage === 'throw'
                        ? ['blur(0px)', 'blur(0.6px)', 'blur(0px)']
                        : 'blur(0px)',
                  }}
                  transition={{ duration: 0.56 }}
                />
              </motion.div>
            )}

            {/* Throw streak: short-lived and tied to the actual projectile. */}
            {stage === 'throw' && (
              <motion.div
                className="pointer-events-none absolute z-30 h-1 w-28 rounded-full bg-gradient-to-r from-transparent via-[#FF6A1A] to-[#B4FF39]"
                initial={{ left: '60%', top: '45%', opacity: 0, scaleX: 0.3 }}
                animate={{ left: '47%', top: '50%', opacity: [0, 0.8, 0], scaleX: [0.3, 1.25, 1.7] }}
                transition={{ duration: 0.56, ease: 'easeOut' }}
                style={{ transformOrigin: 'right center' }}
              />
            )}

            {/* Impact flash gives the throw a physical endpoint before the logo holds. */}
            {stage === 'impact' && (
              <motion.div
                className={`pointer-events-none absolute inset-0 z-50 rounded-full ${isDark ? 'bg-white/10' : 'bg-white/35'}`}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1.15, 1.4] }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              />
            )}

            <motion.div
              className="absolute bottom-2 flex w-full flex-col items-center justify-center px-4 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: ['impact', 'hold', 'logoZoom', 'exit'].includes(stage) ? 1 : 0,
                y: ['impact', 'hold', 'logoZoom', 'exit'].includes(stage) ? 0 : 12,
              }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
            >
              <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/90' : 'text-[#151714]/90'}`}>
                <span>Restoran</span>
                <span className="text-sm font-black text-[#FF6A1A]">WAWASAN</span>
                <span className={`text-xs font-bold ${secondaryText}`}>Pak Usop</span>
              </div>

              <div className={`mt-1.5 h-[3px] w-48 overflow-hidden rounded-full ${isDark ? 'bg-[#1F2320]' : 'bg-[#E5E0D8]'}`}>
                <motion.div
                  className="h-full w-full origin-left rounded-full bg-gradient-to-r from-[#FF6A1A] via-[#FF6A1A] to-[#B4FF39]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: ['impact', 'hold', 'logoZoom', 'exit'].includes(stage) ? 1 : 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                />
              </div>

              <p className={`mt-1 text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-white/70' : 'text-[#151714]/70'}`}>
                Sistem Tempahan Katering
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}

      {stage === 'logoZoom' && (
        <motion.div
          key="logo-zoom"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className={`fixed inset-0 z-[10000] flex items-center justify-center ${isDark ? 'bg-[#151714]' : 'bg-[#FAF8F5]'}`}
        >
          {logoError ? (
            <span className="text-2xl font-black uppercase tracking-tighter">WAWASAN</span>
          ) : (
            <motion.img
              src={getAssetUrl('/assets/wawasan_badge.png')}
              alt="Restoran Wawasan Est. 1986"
              className="h-auto w-56 max-w-[80vw] object-contain"
              initial={{ scale: 0.72 }}
              animate={{ scale: 1.04 }}
              transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
              onError={() => setLogoError(true)}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
