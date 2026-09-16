import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface GhostCursorProps {
  pos: { x: number; y: number } | null;
  gesture: 'tap' | 'type' | 'scroll' | 'select' | 'swipe' | 'idle';
}

interface ActiveBloom {
  id: number;
  x: number;
  y: number;
}

// Beautiful Malaysian Batik-style Flower motif
const BatikFlower: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 120 120" 
      className={className}
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {/* Golden gilded traditional batik petals */}
      <path d="M60 60 C60 30, 42 15, 60 4 C78 15, 60 30, 60 60 Z" className="fill-amber-500/10" />
      <path d="M60 60 C60 90, 78 105, 60 116 C42 105, 60 90, 60 60 Z" className="fill-amber-500/10" />
      <path d="M60 60 C30 60, 15 42, 4 60 C15 78, 30 60, 60 60 Z" className="fill-amber-500/10" />
      <path d="M60 60 C90 60, 105 78, 116 60 C105 42, 90 60, 60 60 Z" className="fill-amber-500/10" />
      
      {/* 4 Diagonal secondary petals */}
      <path d="M60 60 C40 40, 25 22, 20 20 C22 25, 40 40, 60 60 Z" className="fill-amber-600/5" />
      <path d="M60 60 C80 40, 95 22, 100 20 C98 25, 80 40, 60 60 Z" className="fill-amber-600/5" />
      <path d="M60 60 C40 80, 25 98, 20 100 C22 95, 40 80, 60 60 Z" className="fill-amber-600/5" />
      <path d="M60 60 C80 80, 95 98, 100 100 C98 95, 80 80, 60 60 Z" className="fill-amber-600/5" />
      
      {/* Intricate floral center details */}
      <circle cx="60" cy="60" r="7" className="fill-amber-600/40 stroke-amber-500" />
      <circle cx="60" cy="60" r="14" strokeDasharray="3 3" className="stroke-amber-500/60" />
      
      {/* Ornamental golden lace dots */}
      <circle cx="60" cy="18" r="1.5" className="fill-amber-400 stroke-none" />
      <circle cx="60" cy="102" r="1.5" className="fill-amber-400 stroke-none" />
      <circle cx="18" cy="60" r="1.5" className="fill-amber-400 stroke-none" />
      <circle cx="102" cy="60" r="1.5" className="fill-amber-400 stroke-none" />
    </svg>
  );
};

// Hand-carved Asian Wooden Chopsticks SVG (🥢) with interactive pinching logic
const Chopsticks: React.FC<{ gesture: string }> = ({ gesture }) => {
  // Animates the right chopstick to "pinch" closer to the left chopstick on click!
  const rightStickVariants = {
    idle: { rotate: 0 },
    tap: {
      rotate: [0, -8, 0],
      transition: { duration: 0.38, ease: "easeInOut" }
    },
    select: {
      rotate: [0, -8, 0],
      transition: { duration: 0.38, ease: "easeInOut" }
    },
    type: { rotate: 0 },
    swipe: { 
      rotate: [0, 4, 0],
      transition: { duration: 0.45, ease: "easeOut" }
    },
    scroll: { 
      rotate: [0, 6, 0],
      transition: { duration: 0.42, ease: "easeInOut" }
    }
  };

  return (
    <svg 
      width="36" 
      height="72" 
      viewBox="0 0 36 72" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.45))' }}
    >
      {/* Left Chopstick Group (Stationary) */}
      <g>
        <path
          d="M16.5 4 C16.5 4, 15.5 30, 14 68 C14 68, 17 68, 18.5 68 C19 30, 18.5 4, 18.5 4 Z"
          fill="#8B5E3C"
        />
        <path
          d="M15 68 C15.5 30, 17 4, 17 4"
          stroke="#A77855"
          strokeWidth="1"
          strokeLinecap="round"
        />
        {/* Left Lacquer Bands */}
        <rect x="14" y="60" width="4.5" height="4" fill="#D4AF37" />
        <rect x="14" y="64" width="4.5" height="4" fill="#991B1B" />
      </g>

      {/* Right Chopstick Group (Pinchable!) */}
      <motion.g
        variants={rightStickVariants}
        animate={gesture}
        style={{ transformOrigin: '18px 4px' }}
      >
        <path
          d="M17.5 4 C17.5 4, 19.5 30, 22 68 C22 68, 25 68, 26.5 68 C23 30, 19.5 4, 19.5 4 Z"
          fill="#A77855"
        />
        <path
          d="M23.5 68 C21 30, 18.5 4, 18.5 4"
          stroke="#DDBB99"
          strokeWidth="1"
          strokeLinecap="round"
        />
        {/* Right Lacquer Bands */}
        <rect x="21.7" y="60" width="4.5" height="4" fill="#D4AF37" />
        <rect x="20.7" y="64" width="4.5" height="4" fill="#991B1B" />
      </motion.g>
    </svg>
  );
};

export const GhostCursor: React.FC<GhostCursorProps> = ({ pos, gesture }) => {
  const [blooms, setBlooms] = useState<ActiveBloom[]>([]);

  // Capture taps and spawn beautiful Batik blooms
  useEffect(() => {
    if ((gesture === 'tap' || gesture === 'select') && pos) {
      const newId = Date.now();
      setBlooms((prev) => [...prev, { id: newId, x: pos.x, y: pos.y }]);
      
      // Auto-cleanup after animation completes
      const timer = setTimeout(() => {
        setBlooms((prev) => prev.filter((b) => b.id !== newId));
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [gesture, pos]);

  if (!pos) return null;

  // Refined -45deg angle movement physics
  const chopstickVariants = {
    idle: { 
      x: 0, 
      y: 0, 
      rotate: [-45, -43, -45], // Gentle, human-like breathing sway when idle
      scale: 1,
      transition: {
        rotate: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    },
    tap: {
      // Snappy and precise plunge stab along the chopsticks' natural alignment
      x: [0, 8, -14, 0],
      y: [0, 8, -14, 0],
      rotate: -45,
      scale: [1, 0.92, 1.12, 1],
      transition: {
        duration: 0.35,
        times: [0, 0.12, 0.42, 1],
        ease: "easeInOut"
      }
    },
    select: {
      x: [0, 8, -14, 0],
      y: [0, 8, -14, 0],
      rotate: -45,
      scale: [1, 0.92, 1.12, 1],
      transition: {
        duration: 0.35,
        times: [0, 0.12, 0.42, 1],
        ease: "easeInOut"
      }
    },
    type: {
      // Rapid tactile wood tapping vibrations
      x: [0, 0.5, -0.5, 0.5, 0],
      y: [0, -3, 0, -3, 0],
      rotate: -45,
      transition: {
        repeat: Infinity,
        duration: 0.16,
        ease: "easeInOut"
      }
    },
    swipe: {
      rotate: -38,
      x: -3,
      y: -3,
      transition: { duration: 0.22, ease: "easeOut" }
    },
    scroll: {
      rotate: -52,
      x: 3,
      y: 3,
      transition: { duration: 0.22, ease: "easeInOut" }
    }
  };

  return (
    <>
      {/* 1. Permanent Canvas-wide Batik Blooms Container */}
      <div className="fixed inset-0 pointer-events-none z-[99998]">
        <AnimatePresence>
          {blooms.map((bloom) => (
            <motion.div
              key={bloom.id}
              initial={{ scale: 0, opacity: 1, rotate: 0 }}
              animate={{ 
                scale: 1.6, 
                opacity: 0, 
                rotate: 45,
                filter: "drop-shadow(0 0 12px rgba(245, 158, 11, 0.5))"
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                position: 'fixed',
                left: `${bloom.x}px`,
                top: `${bloom.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <BatikFlower className="w-16 h-16 text-amber-500 stroke-amber-500" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 2. Floating Animated Chopsticks Pointer */}
      {/* Enhanced spring physics coefficients matching ultra-responsive physical controls */}
      <motion.div
        aria-hidden="true"
        animate={{ x: pos.x, y: pos.y }}
        transition={{
          type: "spring",
          stiffness: 175,  // Fast and extremely responsive
          damping: 24,     // High friction coefficient for crisp, zero-jitter target settling
          mass: 0.7,       // Lightweight agile bamboo physics
          restDelta: 0.001
        }}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          pointerEvents: 'none',
          zIndex: 99999,
        }}
      >
        <motion.div
          animate={gesture}
          variants={chopstickVariants}
          initial="idle"
          style={{
            transformOrigin: '18px 4px',
            marginTop: '-4px',
            marginLeft: '-18px',
          }}
        >
          <Chopsticks gesture={gesture} />
        </motion.div>
      </motion.div>
    </>
  );
};
