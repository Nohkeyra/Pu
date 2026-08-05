import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { getAssetUrl } from '@/lib/utils';
import { useDeviceMotion3D } from '@/hooks/useDeviceMotion3D';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';

// Helper
const getTimestamp = (): number => performance.now();

interface CinematicLogoProps {
  className?: string;
  sizeClassName?: string;
}

const CinematicLogo: React.FC<CinematicLogoProps> = ({
  className = '',
  sizeClassName = 'w-56 h-56',
}) => {
  const { rotateX, rotateY } = useDeviceMotion3D(15);
  const containerRef = useRef<HTMLDivElement>(null);

  const spinX = useMotionValue(0);
  const spinY = useMotionValue(0);

  const combinedRotateX = useTransform([spinX, rotateX], ([sx, rx]) => (sx as number) + (rx as number));
  const combinedRotateY = useTransform([spinY, rotateY], ([sy, ry]) => (sy as number) + (ry as number));


  const isDragging = useRef(false);
  const lastPointerX = useRef(0);
  const lastPointerY = useRef(0);
  const dragPoints = useRef<{ x: number; y: number; time: number }[]>([]);
  const animationFrameId = useRef<number | null>(null);

  const velocityX = useRef(0);
  const velocityY = useRef(0);
  const currentSpinX = useRef(0);
  const currentSpinY = useRef(0);

  useEffect(() => {
    const unsubX = spinX.on('change', (val) => (currentSpinX.current = val));
    const unsubY = spinY.on('change', (val) => (currentSpinY.current = val));
    return () => {
      unsubX();
      unsubY();
    };
  }, [spinX, spinY]);

  useEffect(() => {
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const lastHapticAngleX = useRef(0);
  const lastHapticAngleY = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
    dragPoints.current = [{ x: e.clientX, y: e.clientY, time: getTimestamp() }];
    e.currentTarget.setPointerCapture(e.pointerId);
    triggerLightImpact();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastPointerX.current;
    const deltaY = e.clientY - lastPointerY.current;
    const nextSpinY = currentSpinY.current + deltaX * 0.95;
    const nextSpinX = currentSpinX.current - deltaY * 0.95;
    spinY.set(nextSpinY);
    spinX.set(nextSpinX);

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
    dragPoints.current.push({ x: e.clientX, y: e.clientY, time: now });
    dragPoints.current = dragPoints.current.filter((p) => now - p.time <= 40);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const now = getTimestamp();
    const history = dragPoints.current.filter((p) => now - p.time <= 40);

    if (history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      const dt = last.time - first.time;
      if (dt > 8) {
        const vx = (last.x - first.x) / dt;
        const vy = (last.y - first.y) / dt;
        velocityY.current = vx * 1.45;
        velocityX.current = -vy * 1.45;

        const maxVelocity = 15.0;
        if (Math.abs(velocityY.current) > maxVelocity)
          velocityY.current = Math.sign(velocityY.current) * maxVelocity;
        if (Math.abs(velocityX.current) > maxVelocity)
          velocityX.current = Math.sign(velocityX.current) * maxVelocity;

        const speed = Math.sqrt(velocityX.current ** 2 + velocityY.current ** 2);
        if (speed > 1.5) triggerMediumImpact();
        else if (speed > 0.1) triggerLightImpact();

        if (speed > 0.05) animatePhysics();
        else animatePhysics(true);
      } else {
        animatePhysics(true);
      }
    } else {
      animatePhysics(true);
    }
  };

  const handlePointerCancel = () => {
    isDragging.current = false;
    animatePhysics(true);
  };

  const animatePhysics = (forceCentering = false) => {
    let lastTime = getTimestamp();
    let isCentering = forceCentering;

    const step = (time: number) => {
      const dt = Math.min(time - lastTime, 30);
      lastTime = time;

      if (!isCentering) {
        currentSpinX.current += velocityX.current * dt;
        currentSpinY.current += velocityY.current * dt;
        spinX.set(currentSpinX.current);
        spinY.set(currentSpinY.current);
        velocityX.current *= Math.pow(0.98, dt / 16);
        velocityY.current *= Math.pow(0.98, dt / 16);

        const speed = Math.sqrt(velocityX.current ** 2 + velocityY.current ** 2);
        if (speed < 0.04) isCentering = true;
      } else {
        const targetX = Math.round(currentSpinX.current / 360) * 360;
        const targetY = Math.round(currentSpinY.current / 360) * 360;
        const diffX = targetX - currentSpinX.current;
        const diffY = targetY - currentSpinY.current;
        const stiffness = 0.004;
        const damping = 0.91;

        velocityX.current = (velocityX.current + diffX * stiffness * dt) * Math.pow(damping, dt / 16);
        velocityY.current = (velocityY.current + diffY * stiffness * dt) * Math.pow(damping, dt / 16);

        currentSpinX.current += velocityX.current * dt;
        currentSpinY.current += velocityY.current * dt;
        spinX.set(currentSpinX.current);
        spinY.set(currentSpinY.current);

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
    <div className={`relative flex items-center justify-center ${className}`} style={{ perspective: 1200 }}>
      <motion.div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
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
        <picture className="w-full h-full flex items-center justify-center pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
          <img
            src={getAssetUrl('/assets/wawasan_logo.svg')}
            alt="Restoran Wawasan Logo"
            className="w-full h-full object-contain drop-shadow-2xl select-none"
            style={{ transform: 'translateZ(40px)' }}
          />
        </picture>
      </motion.div>
    </div>
  );
};

export default CinematicLogo;
