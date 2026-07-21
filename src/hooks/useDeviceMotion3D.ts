import { useEffect } from 'react';
import { Motion } from '@capacitor/motion';
import { Capacitor } from '@capacitor/core';
import { useMotionValue, useSpring } from 'motion/react';

export function useDeviceMotion3D(maxRotation = 20) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth the raw values using a spring
  const springConfig = { damping: 20, stiffness: 100, mass: 0.5 };
  const rotateX = useSpring(x, springConfig);
  const rotateY = useSpring(y, springConfig);

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;
    let isActive = true;

    const requestPermsAndSetup = async () => {
      try {
        if (!Capacitor.isNativePlatform()) {
          if (typeof (window as { DeviceMotionEvent?: { requestPermission?: () => void } }).DeviceMotionEvent !== 'undefined' && typeof (window as { DeviceMotionEvent?: { requestPermission?: () => void } }).DeviceMotionEvent?.requestPermission === 'function') {
            try {
              const perm = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
              if (perm !== 'granted') {
                console.warn('Device motion permission not granted');
              }
            } catch {
              // Might require user gesture
              console.warn("Device motion permission requires user gesture");
            }
          }
        }
      } catch { /* ignore */ }

      try {
        if (Capacitor.isNativePlatform()) {
          // Native Capacitor platform
          listenerHandle = await Motion.addListener('accel', (event) => {
            if (!isActive) return;
            const accel = event.accelerationIncludingGravity;
            // Native mapping:
            // Tilting phone up/down changes y (typically)
            // Tilting phone left/right changes x
            const rx = Math.min(Math.max((accel.y || 0) * 3, -maxRotation), maxRotation);
            const ry = Math.min(Math.max((accel.x || 0) * -3, -maxRotation), maxRotation);
            x.set(rx);
            y.set(ry);
          });
        } else {
          // Web fallback: mouse move
          const handleMouseMove = (e: MouseEvent) => {
            if (!isActive) return;
            const xPos = (e.clientX / window.innerWidth) - 0.5;
            const yPos = (e.clientY / window.innerHeight) - 0.5;
            
            x.set(-yPos * maxRotation * 2);
            y.set(xPos * maxRotation * 2);
          };
          window.addEventListener('mousemove', handleMouseMove);
          listenerHandle = {
            remove: () => window.removeEventListener('mousemove', handleMouseMove)
          };
        }
      } catch {
        console.warn("Motion setup failed");
      }
    };

    requestPermsAndSetup();

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
