import { useEffect, type ReactNode } from 'react';
import { Motion } from '@capacitor/motion';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { useMotionValue, useSpring } from 'motion/react';
import { BatikMotionContext } from '@/context/batikMotionContext';

// One shared sensor/mouse input for every Batik3DMotion instance.
// Individual instances scale the normalized [-1, 1] output themselves.
const REFERENCE_MAX = 15;

export function BatikMotionProvider({ children }: { children: ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 22, stiffness: 120, mass: 0.4 };
  const rawX = useSpring(x, springConfig);
  const rawY = useSpring(y, springConfig);

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;
    let appStateHandle: { remove: () => void } | null = null;
    let isActive = true;
    let isAppInForeground = true;

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

    let isScrolling = false;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      isScrolling = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        scrollTimeout = null;
      }, 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isAppInForeground = false;
        resetToNeutral();
      } else {
        isAppInForeground = true;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const setupMotion = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Handle asynchronous listener registration racing component unmount.
          try {
            const handle = await CapApp.addListener('appStateChange', (state) => {
              if (!isActive) return;
              isAppInForeground = state.isActive;
              if (!state.isActive) resetToNeutral();
            });
            if (isActive) appStateHandle = handle;
            else void handle.remove();
          } catch {
            // The browser visibility listener remains a fallback.
          }

          if (!isActive) return;
          const handle = await Motion.addListener('accel', (event) => {
            if (!isActive || !isAppInForeground || isScrolling) return;
            const accel = event.accelerationIncludingGravity;
            if (!accel) return;
            const rx = Math.min(Math.max(((accel.y || 0) * 2.5) / REFERENCE_MAX, -1), 1);
            const ry = Math.min(Math.max(((accel.x || 0) * -2.5) / REFERENCE_MAX, -1), 1);
            x.set(rx);
            y.set(ry);
          });
          if (isActive) listenerHandle = handle;
          else void handle.remove();
        } else {
          let hasGyroscope = false;
          const handleOrientation = (e: DeviceOrientationEvent) => {
            if (!isActive || !isAppInForeground || isScrolling || e.beta === null || e.gamma === null) return;
            hasGyroscope = true;
            const tiltX = Math.min(Math.max(((e.beta - 45) * 0.4) / REFERENCE_MAX, -1), 1);
            const tiltY = Math.min(Math.max((e.gamma * 0.4) / REFERENCE_MAX, -1), 1);
            x.set(-tiltX);
            y.set(tiltY);
          };
          if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }

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
        console.warn('Motion setup fallback active');
      }
    };

    void setupMotion();

    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (appStateHandle) void appStateHandle.remove();
      if (listenerHandle) void listenerHandle.remove();
    };
    // The stable MotionValue sources are held for the provider's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BatikMotionContext.Provider value={{ rawX, rawY }}>
      {children}
    </BatikMotionContext.Provider>
  );
}
