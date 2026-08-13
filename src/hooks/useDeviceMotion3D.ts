import { useEffect } from 'react';
import { Motion } from '@capacitor/motion';
import { Capacitor } from '@capacitor/core';
import { useMotionValue, useSpring } from 'motion/react';

// FEATURE (2026-08-13): Noh wants the Login logo to follow the phone's
// FULL physical rotation (0-360deg, e.g. landscape = ~90deg), not just the
// existing subtle ±15deg "tilt toward you" effect. The two need different
// math — 'tilt' scales the raw accelerometer reading and clamps it (good
// for a small, direction-of-gravity nudge), while 'full-rotation' computes
// the actual roll angle via atan2(x, z) on the gravity vector, which is the
// standard way to derive a device's real-world rotation angle from
// accelerometer data, then unwraps it so it doesn't "jump" ±180deg.
// Default stays 'tilt' so the two other existing callers
// (CinematicLogo.tsx, Batik3DMotion.tsx) are completely unaffected.
type MotionMode = 'tilt' | 'full-rotation';

export function useDeviceMotion3D(maxRotation = 15, mode: MotionMode = 'tilt') {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const z = useMotionValue(0);

  // Smooth the raw values using a spring
  const springConfig = { damping: 22, stiffness: 120, mass: 0.4 };
  const rotateX = useSpring(x, springConfig);
  const rotateY = useSpring(y, springConfig);
  // For full-rotation mode: a single Z-axis spin angle derived from atan2.
  const rotateZ = useSpring(z, springConfig);

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;
    let isActive = true;
    // Tracks the running unwrapped angle so atan2's -180/+180 wraparound
    // doesn't cause the logo to visibly snap when crossing that boundary.
    let lastRawAngleDeg: number | null = null;
    let unwrappedAngleDeg = 0;

    const applyFullRotation = (accelX: number, accelZ: number) => {
      // atan2(x, z) on the gravity vector gives the device's roll angle:
      // ~0deg flat/portrait-up, ~±90deg on its side (landscape).
      const rawAngleDeg = Math.atan2(accelX, accelZ) * (180 / Math.PI);

      if (lastRawAngleDeg === null) {
        unwrappedAngleDeg = rawAngleDeg;
      } else {
        let delta = rawAngleDeg - lastRawAngleDeg;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        unwrappedAngleDeg += delta;
      }
      lastRawAngleDeg = rawAngleDeg;
      z.set(unwrappedAngleDeg);
    };

    const setupMotion = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Native Capacitor platform accelerometer / motion
          const handle = await Motion.addListener('accel', (event) => {
            if (!isActive) return;
            const accel = event.accelerationIncludingGravity;
            if (!accel) return;

            if (mode === 'full-rotation') {
              applyFullRotation(accel.x || 0, accel.z || 0);
              return;
            }

            // Map tilt values smoothly:
            const rx = Math.min(Math.max((accel.y || 0) * 2.5, -maxRotation), maxRotation);
            const ry = Math.min(Math.max((accel.x || 0) * -2.5, -maxRotation), maxRotation);
            x.set(rx);
            y.set(ry);
          });
          
          if (!isActive) {
            if (handle && typeof handle.remove === 'function') {
              handle.remove();
            }
          } else {
            listenerHandle = handle;
          }
        } else {
          // Web / Browser environment
          // 1. Check for DeviceOrientation API (Mobile Web Gyroscope)
          let hasGyroscope = false;

          const handleOrientation = (e: DeviceOrientationEvent) => {
            if (!isActive || e.beta === null || e.gamma === null) return;
            hasGyroscope = true;

            if (mode === 'full-rotation') {
              // gamma is left-right tilt [-90, 90] — the closest web
              // equivalent to physical roll for this fallback path.
              z.set(e.gamma);
              return;
            }
            
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
                if (mode === 'full-rotation') {
                  z.set(mouseX * 90);
                } else {
                  x.set(-mouseY * maxRotation * 1.8);
                  y.set(mouseX * maxRotation * 1.8);
                }
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
  }, [maxRotation, mode, x, y, z]);

  return { rotateX, rotateY, rotateZ };
}
