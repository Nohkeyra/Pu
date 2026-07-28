import { useEffect } from 'react';
import { useNativeAppState } from '@/hooks/useNativeAppState';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useDeepLinks } from '@/hooks/useDeepLinks';
import { Motion } from '@capacitor/motion';
import { Capacitor } from '@capacitor/core';

/**
 * An invisible component that wraps native listeners 
 * so they have access to React context (like useToast)
 */
function NativeAppListeners() {
  useNativeAppState();
  useNetworkStatus();
  useDeepLinks();

  useEffect(() => {
    let active = true;

    const requestMotionPermissions = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Warm up Capacitor Motion plugin sensor listener upon app initialization
          const listener = await Motion.addListener('accel', () => {
            // Warm-up listener trigger
          });
          if (!active && listener) {
            if (typeof listener.remove === 'function') {
              listener.remove();
            }
          }
        } else {
          // Web motion and orientation permission request (iOS Safari & supporting browsers)
          const win = window as unknown as {
            DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
            DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
          };

          if (typeof win.DeviceMotionEvent?.requestPermission === 'function') {
            try {
              const res = await win.DeviceMotionEvent.requestPermission();
              console.log('[NativeAppListeners] Device Motion Permission:', res);
            } catch {
              console.warn('[NativeAppListeners] Device Motion permission requires user gesture');
            }
          }

          if (typeof win.DeviceOrientationEvent?.requestPermission === 'function') {
            try {
              const res = await win.DeviceOrientationEvent.requestPermission();
              console.log('[NativeAppListeners] Device Orientation Permission:', res);
            } catch {
              console.warn('[NativeAppListeners] Device Orientation permission requires user gesture');
            }
          }
        }
      } catch {
        /* Ignore permissions setup errors on unsupported devices */
      }
    };

    requestMotionPermissions();

    return () => {
      active = false;
    };
  }, []);
  
  return null;
}

export default NativeAppListeners;
