import { useEffect, useState, useCallback } from 'react';
import { useNativeAppState } from '@/hooks/native/useNativeAppState';
import { useNetworkStatus } from '@/hooks/native/useNetworkStatus';
import { useDeepLinks } from '@/hooks/native/useDeepLinks';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { notifyCapgoAppReady } from '@/services/updateService';
import { getPendingOrdersCount, rehydrateQueueFromNative } from '@/lib/pendingOrdersQueue';
import { PendingOrdersDialog } from '@/components/order/PendingOrdersDialog';

/** Native listeners have access to React context (including toasts). */
function NativeAppListeners() {
  useNativeAppState();
  useNetworkStatus();
  useDeepLinks();

  const [pendingOrdersDialogOpen, setPendingOrdersDialogOpen] = useState(false);

  useEffect(() => {
    notifyCapgoAppReady();
  }, []);

  // Never auto-submit a cached offline order. Rehydrate the queue and let
  // the customer explicitly review each pending action in the dialog.
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
    let listenerHandle: { remove: () => void } | null = null;

    const setupPendingOrdersListener = async () => {
      try {
        const initial = await Network.getStatus();
        if (!isActive) return;
        wasOnline = initial.connected;
      } catch {
        wasOnline = null;
      }

      try {
        const handle = await Network.addListener('networkStatusChange', (status) => {
          if (!isActive) return;
          const isNowOnline = status.connected;
          const justCameOnline = wasOnline === false && isNowOnline === true;
          wasOnline = isNowOnline;
          if (justCameOnline) void triggerPendingOrdersCheck();
        });
        if (isActive) listenerHandle = handle;
        else void handle.remove();
      } catch (err) {
        console.warn('[NativeAppListeners] Unable to observe network changes:', err);
      }
    };

    void setupPendingOrdersListener();
    return () => {
      isActive = false;
      if (listenerHandle) void listenerHandle.remove();
    };
  }, [triggerPendingOrdersCheck]);

  useEffect(() => {
    const checkOnMount = async () => {
      try {
        const status = await Network.getStatus();
        if (status.connected) await triggerPendingOrdersCheck();
      } catch {
        // Non-critical: the subsequent reconnect listener still handles it.
      }
    };
    void checkOnMount();
  }, [triggerPendingOrdersCheck]);

  useEffect(() => {
    // BatikMotionProvider owns the single native accelerometer listener.
    // A second no-op "warm-up" listener would only consume resources.
    // Preserve the pre-existing best-effort browser permission flow.
    if (Capacitor.isNativePlatform()) return;
    const requestMotionPermissions = async () => {
      try {
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
      } catch {
        // Unsupported browser.
      }
    };
    void requestMotionPermissions();
  }, []);

  return (
    <PendingOrdersDialog open={pendingOrdersDialogOpen} onOpenChange={setPendingOrdersDialogOpen} />
  );
}

export default NativeAppListeners;
