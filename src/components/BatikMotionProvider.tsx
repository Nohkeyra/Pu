import { useEffect, type ReactNode } from 'react';
import { Motion } from '@capacitor/motion';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { useMotionValue, useSpring } from 'motion/react';
import { BatikMotionContext } from '@/context/batikMotionContext';

// F-DUP (audit 2026-09-03): previously every <Batik3DMotion> instance called
// its own useDeviceMotion3D() and opened its own deviceorientation/mousemove
// (or native accelerometer) listener. Up to 8 instances can be mounted at
// once across the app (e.g. a page's own batik layer behind AuthModal's own
// batik layer, or HeroSection + Footer both mounted for the whole landing-
// page session) — each one doing full duplicate tilt math on every single
// mousemove/orientation event, including instances currently scrolled off
// screen or hidden behind a modal. This component now owns exactly ONE
// listener for the whole app lifetime; individual Batik3DMotion instances
// (via useDeviceMotion3D in hooks/useDeviceMotion3D.ts) read shared,
// pre-smoothed, normalized (~[-1, 1]) tilt values from context and scale
// them to their own maxRotation locally.
// Reference max used to normalize raw sensor/mouse signals to roughly
// [-1, 1] before per-instance scaling (matches the largest maxRotation
// actually used today, so existing "full-intensity" instances feel
// unchanged; smaller maxRotation instances get proportionally gentler tilt,
// same as before).
const REFERENCE_MAX = 15;

export function BatikMotionProvider({ children }: { children: ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth the raw values using a spring — done once here rather than once
  // per Batik3DMotion instance (spring smoothing is scale-invariant, so
  // sharing it doesn't change the feel of any individual instance).
  const springConfig = { damping: 22, stiffness: 120, mass: 0.4 };
  const rawX = useSpring(x, springConfig);
  const rawY = useSpring(y, springConfig);

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;
    let appStateHandle: { remove: () => void } | null = null;
    let isActive = true;
    let isAppInForeground = true;

    // Check prefers-reduced-motion for accessibility & battery conservation
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      x.set(0);
      y.set(0);
      return;
    }

    const resetToNeutral = () => {
      x.set(0);
      y.set(0);
    };

    // Track tab/app visibility so we do not burn CPU/battery when in background
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        isAppInForeground = false;
        resetToNeutral();
      } else {
        isAppInForeground = true;
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    const setupMotion = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Native app background state listener
          try {
            appStateHandle = await CapApp.addListener('appStateChange', (state) => {
              isAppInForeground = state.isActive;
              if (!state.isActive) {
                resetToNeutral();
              }
            });
          } catch {
            // Non-critical fallback
          }

          // Native Capacitor platform accelerometer / motion
          const handle = await Motion.addListener('accel', (event) => {
            if (!isActive || !isAppInForeground) return;
            const accel = event.accelerationIncludingGravity;
            if (!accel) return;

            const rx = Math.min(Math.max(((accel.y || 0) * 2.5) / REFERENCE_MAX, -1), 1);
            const ry = Math.min(Math.max(((accel.x || 0) * -2.5) / REFERENCE_MAX, -1), 1);
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
            if (!isActive || !isAppInForeground || e.beta === null || e.gamma === null) return;
            hasGyroscope = true;

            // beta is front-back tilt [-180, 180]
            // gamma is left-right tilt [-90, 90]
            const tiltX = Math.min(Math.max(((e.beta - 45) * 0.4) / REFERENCE_MAX, -1), 1);
            const tiltY = Math.min(Math.max((e.gamma * 0.4) / REFERENCE_MAX, -1), 1);

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
            if (!isActive || !isAppInForeground || hasGyroscope) return;
            mouseX = (e.clientX / window.innerWidth) - 0.5;
            mouseY = (e.clientY / window.innerHeight) - 0.5;

            if (!rafId) {
              rafId = requestAnimationFrame(() => {
                if (!isActive || !isAppInForeground) {
                  rafId = 0;
                  return;
                }
                x.set(-mouseY * 1.8);
                y.set(mouseX * 1.8);
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
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (appStateHandle && typeof appStateHandle.remove === 'function') {
        appStateHandle.remove();
      }
      if (listenerHandle) {
        if (typeof listenerHandle.remove === 'function') {
          listenerHandle.remove();
        } else if (typeof (listenerHandle as { removeListener?: () => void }).removeListener === 'function') {
          (listenerHandle as { removeListener?: () => void }).removeListener!();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BatikMotionContext.Provider value={{ rawX, rawY }}>
      {children}
    </BatikMotionContext.Provider>
  );
}
