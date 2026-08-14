import { useEffect, useState, useCallback } from 'react';
import { useNativeAppState } from '@/hooks/useNativeAppState';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useDeepLinks } from '@/hooks/useDeepLinks';
import { Motion } from '@capacitor/motion';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { notifyCapgoAppReady } from '@/services/updateService';
import { getPendingOrdersCount, rehydrateQueueFromNative } from '@/lib/pendingOrdersQueue';
import { PendingOrdersDialog } from '@/components/PendingOrdersDialog';

/**
 * An invisible component that wraps native listeners 
 * so they have access to React context (like useToast)
 */
function NativeAppListeners() {
  useNativeAppState();
  useNetworkStatus();
  useDeepLinks();

  const [pendingOrdersDialogOpen, setPendingOrdersDialogOpen] = useState(false);

  useEffect(() => {
    // Confirm Capgo OTA bundle ready to prevent automatic rollback
    notifyCapgoAppReady();
  }, []);

  // F-OFFLINE (audit 2026-08-14): this used to call autoSyncPendingOrders(),
  // which POSTed every queued order to the server the moment connectivity
  // returned — no review, no stale-date check. That directly contradicted
  // the confirm-before-send design documented in PendingOrdersDialog.tsx
  // ("Deliberately NOT auto-flushed — an order queued while offline may now
  // be for a date/time that has already passed"). Now this only rehydrates
  // the queue (in case the app was killed while offline with items already
  // saved) and opens the dialog if anything is pending — sending or
  // discarding each order is left entirely to the customer via the dialog.
  const triggerPendingOrdersCheck = useCallback(async () => {
    try {
      await rehydrateQueueFromNative();
      if (getPendingOrdersCount() > 0) {
        setPendingOrdersDialogOpen(true);
      }
    } catch (err) {
      console.warn('[NativeAppListeners] Pending orders check failed:', err);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    let wasOnline: boolean | null = null;

    const setupPendingOrdersListener = async () => {
      try {
        const initial = await Network.getStatus();
        wasOnline = initial.connected;
      } catch {
        wasOnline = null;
      }

      await Network.addListener('networkStatusChange', (status) => {
        if (!isActive) return;
        const isNowOnline = status.connected;
        const justCameOnline = wasOnline === false && isNowOnline === true;
        wasOnline = isNowOnline;

        if (justCameOnline) {
          triggerPendingOrdersCheck();
        }
      });
    };

    setupPendingOrdersListener();

    return () => {
      isActive = false;
    };
  }, [triggerPendingOrdersCheck]);

  // Also check once on mount, in case the app was killed while offline
  // with items already queued and is now reopened already connected.
  useEffect(() => {
    const checkOnMount = async () => {
      try {
        const status = await Network.getStatus();
        if (status.connected) {
          await triggerPendingOrdersCheck();
        }
      } catch {
        /* ignore */
      }
    };
    checkOnMount();
  }, [triggerPendingOrdersCheck]);

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
  
  return (
    <PendingOrdersDialog open={pendingOrdersDialogOpen} onOpenChange={setPendingOrdersDialogOpen} />
  );
}

export default NativeAppListeners;
