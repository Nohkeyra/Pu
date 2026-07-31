import { useEffect } from 'react';
import { Motion } from '@capacitor/motion';
import { Capacitor } from '@capacitor/core';
import { useMotionValue, useSpring } from 'motion/react';

export function useDeviceMotion3D(maxRotation = 15) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth the raw values using a spring
  const springConfig = { damping: 22, stiffness: 120, mass: 0.4 };
  const rotateX = useSpring(x, springConfig);
  const rotateY = useSpring(y, springConfig);

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;
    let isActive = true;

    const setupMotion = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Native Capacitor platform accelerometer / motion
          listenerHandle = await Motion.addListener('accel', (event) => {
            if (!isActive) return;
            const accel = event.accelerationIncludingGravity;
            if (!accel) return;
            
            // Map tilt values smoothly:
            const rx = Math.min(Math.max((accel.y || 0) * 2.5, -maxRotation), maxRotation);
            const ry = Math.min(Math.max((accel.x || 0) * -2.5, -maxRotation), maxRotation);
            x.set(rx);
            y.set(ry);
          });
        } else {
          // Web / Browser environment
          // 1. Check for DeviceOrientation API (Mobile Web Gyroscope)
          let hasGyroscope = false;

          const handleOrientation = (e: DeviceOrientationEvent) => {
            if (!isActive || e.beta === null || e.gamma === null) return;
            hasGyroscope = true;
            
            // beta is front-back tilt [-180, 180]
            // gamma is left-right tilt [-90, 90]
            const tiltX = Math.min(Math.max((e.beta - 45) * 0.4, -maxRotation), maxRotation);
            const tiltY = Math.min(Math.max(e.gamma * 0.4, -maxRotation), maxRotation);
            
            x.set(-tiltX);
            y.set(tiltY);
          };

          if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }

          // 2. Mouse move handler for Desktop (throttled with rAF)
          let rafId = 0;
          let mouseX = 0;
          let mouseY = 0;

          const handleMouseMove = (e: MouseEvent) => {
            if (!isActive || hasGyroscope) return;
            mouseX = (e.clientX / window.innerWidth) - 0.5;
            mouseY = (e.clientY / window.innerHeight) - 0.5;

            if (!rafId) {
              rafId = requestAnimationFrame(() => {
                x.set(-mouseY * maxRotation * 1.8);
                y.set(mouseX * maxRotation * 1.8);
                rafId = 0;
              });
            }
          };

          window.addEventListener('mousemove', handleMouseMove, { passive: true });

          listenerHandle = {
            remove: () => {
              window.removeEventListener('deviceorientation', handleOrientation, true);
              window.removeEventListener('mousemove', handleMouseMove);
              if (rafId) cancelAnimationFrame(rafId);
            }
          };
        }
      } catch {
        console.warn("Motion setup fallback active");
      }
    };

    setupMotion();

    return () => {
      isActive = false;
      if (listenerHandle) {
        if (typeof listenerHandle.remove === 'function') {
          listenerHandle.remove();
        } else if (typeof (listenerHandle as { removeListener?: () => void }).removeListener === 'function') {
          (listenerHandle as { removeListener?: () => void }).removeListener!();
        }
      }
    };
  }, [maxRotation, x, y]);

  return { rotateX, rotateY };
}
