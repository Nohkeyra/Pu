import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';
import { useDeviceMotion3D } from '@/hooks/useDeviceMotion3D';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';

// Helper declared outside the component to satisfy ESLint purity rules
const getTimestamp = (): number => {
  return performance.now();
};

interface CinematicLogoProps {
  className?: string;
  sizeClassName?: string;
}

export const CinematicLogo: React.FC<CinematicLogoProps> = ({
  className = '',
  sizeClassName = 'w-56 h-56',
}) => {
  // Gyroscope/Mouse subtle tilt offsets
  const { rotateX, rotateY } = useDeviceMotion3D(15);
  const containerRef = useRef<HTMLDivElement>(null);

  // 3D rotation values for the swipe spin effect
  const spinX = useMotionValue(0);
  const spinY = useMotionValue(0);

  // Combined rotation (swipe spin + device motion tilt)
  const combinedRotateX = useTransform(
    [spinX, rotateX],
    ([sx, rx]) => (sx as number) + (rx as number)
  );
  const combinedRotateY = useTransform(
    [spinY, rotateY],
    ([sy, ry]) => (sy as number) + (ry as number)
  );

  // Gesture state tracking refs
  const isDragging = useRef(false);
  const lastPointerX = useRef(0);
  const lastPointerY = useRef(0);
  const dragPoints = useRef<{ x: number; y: number; time: number }[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Momentum velocities (degrees per millisecond)
  const velocityX = useRef(0);
  const velocityY = useRef(0);

  // Track current values to bypass closures in animation loop
  const currentSpinX = useRef(0);
  const currentSpinY = useRef(0);

  useEffect(() => {
    const unsubX = spinX.on('change', (val) => {
      currentSpinX.current = val;
    });
    const unsubY = spinY.on('change', (val) => {
      currentSpinY.current = val;
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [spinX, spinY]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Angle tracking for haptic clicks
  const lastHapticAngleX = useRef(0);
  const lastHapticAngleY = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Stop any ongoing momentum or spring centering animation
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    velocityX.current = 0;
    velocityY.current = 0;

    isDragging.current = true;
    lastPointerX.current = e.clientX;
    lastPointerY.current = e.clientY;

    lastHapticAngleX.current = currentSpinX.current;
    lastHapticAngleY.current = currentSpinY.current;

    const now = getTimestamp();
    dragPoints.current = [{
      x: e.clientX,
      y: e.clientY,
      time: now
    }];

    e.currentTarget.setPointerCapture(e.pointerId);
    triggerLightImpact();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - lastPointerX.current;
    const deltaY = e.clientY - lastPointerY.current;

    // Direct 3D rotation mapping: horizontal swipe rotates around Y-axis, vertical rotates around X-axis
    // Increased tracking sensitivity for higher accuracy (0.95 multiplier)
    const nextSpinY = currentSpinY.current + deltaX * 0.95;
    const nextSpinX = currentSpinX.current - deltaY * 0.95;

    spinY.set(nextSpinY);
    spinX.set(nextSpinX);

    // Trigger elegant haptic tick on every 30 degrees of manual rotation for tighter tactile response
    if (
      Math.abs(nextSpinY - lastHapticAngleY.current) >= 30 ||
      Math.abs(nextSpinX - lastHapticAngleX.current) >= 30
    ) {
      triggerLightImpact();
      lastHapticAngleY.current = nextSpinY;
      lastHapticAngleX.current = nextSpinX;
    }

    lastPointerX.current = e.clientX;
    lastPointerY.current = e.clientY;

    const now = getTimestamp();
    dragPoints.current.push({
      x: e.clientX,
      y: e.clientY,
      time: now
    });

    // Prune history to the last 40ms to capture the instantaneous swipe/slash velocity precisely
    dragPoints.current = dragPoints.current.filter(p => now - p.time <= 40);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const now = getTimestamp();
    // Use the last 40ms window to isolate the final high-speed release swipe/slash movement
    const history = dragPoints.current.filter(p => now - p.time <= 40);

    if (history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      const dt = last.time - first.time;

      if (dt > 8) {
        // Calculate dragging velocity (pixels per millisecond)
        const vx = (last.x - first.x) / dt;
        const vy = (last.y - first.y) / dt;

        // Convert to high-fidelity angular velocity (degrees per millisecond) with responsive multiplier (1.45)
        velocityY.current = vx * 1.45;
        velocityX.current = -vy * 1.45;

        // Bounding maximum spin speed raised significantly to support extremely fast, explosive slashes
        const maxVelocity = 15.0; 
        if (Math.abs(velocityY.current) > maxVelocity) {
          velocityY.current = Math.sign(velocityY.current) * maxVelocity;
        }
        if (Math.abs(velocityX.current) > maxVelocity) {
          velocityX.current = Math.sign(velocityX.current) * maxVelocity;
        }

        // Trigger dynamic haptics depending on speed
        const speed = Math.sqrt(velocityX.current * velocityX.current + velocityY.current * velocityY.current);
        if (speed > 1.5) {
          triggerMediumImpact();
        } else if (speed > 0.1) {
          triggerLightImpact();
        }

        // Begin deceleration/momentum loop
        if (speed > 0.05) {
          animatePhysics();
        } else {
          // If swipe is too slow, spring back to center immediately
          animatePhysics(true);
        }
      } else {
        animatePhysics(true);
      }
    } else {
      animatePhysics(true);
    }
  };

  // Advanced physical simulation: Momentum with drag friction, followed by a soft centering spring force
  const animatePhysics = (forceCentering = false) => {
    let lastTime = getTimestamp();
    let isCentering = forceCentering;

    const step = (time: number) => {
      const dt = Math.min(time - lastTime, 30); // Cap delta time to prevent physics explosions
      lastTime = time;

      if (!isCentering) {
        // Mode 1: Inertia decay with highly polished low-friction glide (friction factor 0.98 for beautiful spins)
        currentSpinX.current += velocityX.current * dt;
        currentSpinY.current += velocityY.current * dt;

        spinX.set(currentSpinX.current);
        spinY.set(currentSpinY.current);

        velocityX.current *= Math.pow(0.98, dt / 16);
        velocityY.current *= Math.pow(0.98, dt / 16);

        // Haptic feedback during spin - tick every 30 degrees
        if (
          Math.abs(currentSpinY.current - lastHapticAngleY.current) >= 30 ||
          Math.abs(currentSpinX.current - lastHapticAngleX.current) >= 30
        ) {
          const speed = Math.sqrt(velocityX.current * velocityX.current + velocityY.current * velocityY.current);
          if (speed > 0.2) {
            triggerLightImpact();
          }
          lastHapticAngleY.current = currentSpinY.current;
          lastHapticAngleX.current = currentSpinX.current;
        }

        const speed = Math.sqrt(velocityX.current * velocityX.current + velocityY.current * velocityY.current);
        // Seamlessly transition to spring centering at a very slow velocity threshold for a satisfying finish
        if (speed < 0.04) {
          isCentering = true;
        }
      } else {
        // Mode 2: Center-returning spring force to return readable logo to front
        // Targets are nearest multiples of 360 so it doesn't spin all the way back to 0 if it completed full turns
        const targetX = Math.round(currentSpinX.current / 360) * 360;
        const targetY = Math.round(currentSpinY.current / 360) * 360;

        const diffX = targetX - currentSpinX.current;
        const diffY = targetY - currentSpinY.current;

        // Hooke's Law Spring: acceleration = stiffness * displacement - damping * velocity
        const stiffness = 0.004;
        const damping = 0.91;

        velocityX.current = (velocityX.current + diffX * stiffness * dt) * Math.pow(damping, dt / 16);
        velocityY.current = (velocityY.current + diffY * stiffness * dt) * Math.pow(damping, dt / 16);

        currentSpinX.current += velocityX.current * dt;
        currentSpinY.current += velocityY.current * dt;

        spinX.set(currentSpinX.current);
        spinY.set(currentSpinY.current);

        // Terminate animation when it's fully settled
        if (
          Math.abs(diffX) < 0.05 &&
          Math.abs(diffY) < 0.05 &&
          Math.abs(velocityX.current) < 0.005 &&
          Math.abs(velocityY.current) < 0.005
        ) {
          spinX.set(targetX);
          spinY.set(targetY);
          animationFrameId.current = null;
          return;
        }
      }

      animationFrameId.current = requestAnimationFrame(step);
    };

    animationFrameId.current = requestAnimationFrame(step);
  };

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ perspective: 1200 }}
    >
      {/* 3D Motion Container */}
      <motion.div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 110, damping: 14 }}
        style={{
          rotateX: combinedRotateX,
          rotateY: combinedRotateY,
          transformStyle: 'preserve-3d',
        }}
        className={`relative flex items-center justify-center ${sizeClassName} z-10 cursor-grab active:cursor-grabbing touch-none select-none`}
      >
        {/* Floating 3D Logo Image with mix-blend-multiply to naturally key out the white background, and drop-shadow-2xl to give accurate shape shadows */}
        <img
          src={getAssetUrl('/assets/wawasan_logo.jpg')}
          alt="Pak Usop Catering Logo"
          className="w-full h-full object-contain mix-blend-multiply drop-shadow-2xl select-none"
          style={{ transform: 'translateZ(40px)' }}
        />
      </motion.div>
    </div>
  );
};

export default CinematicLogo;
