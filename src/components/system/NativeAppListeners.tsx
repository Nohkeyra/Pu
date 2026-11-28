import { useEffect, useState, useCallback, useRef } from 'react';
import { useNativeAppState } from '@/hooks/native/useNativeAppState';
import { useNetworkStatus } from '@/hooks/native/useNetworkStatus';
import { useDeepLinks } from '@/hooks/native/useDeepLinks';
import { useToast } from '@/components/ui/Toast';
import { Capacitor } from '@capacitor/core';
import { notifyCapgoAppReady } from '@/services/updateService';
import { getPendingOrdersCount, rehydrateQueueFromNative } from '@/lib/pendingOrdersQueue';
import { PendingOrdersDialog } from '@/components/order/PendingOrdersDialog';

/** Native listeners have access to React context (including toasts). */
function NativeAppListeners() {
  useNativeAppState();
  const { isOnline, isReady } = useNetworkStatus();
  const { toast } = useToast();
  const previousOnline = useRef<boolean | null>(null);
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
    if (!isReady) return;
    const previous = previousOnline.current;
    if (previous === isOnline) return;
    previousOnline.current = isOnline;
    if (isOnline) {
      if (previous === false) toast({
        title: 'Talian Disambung / Connection Restored',
        description: 'Anda kembali dalam talian.',
        variant: 'success', duration: 3000,
      });
      void triggerPendingOrdersCheck();
    } else if (previous === null) {
      toast({
        title: 'Tiada Internet / No Internet',
        description: 'Sila periksa sambungan rangkaian anda / Please check your connection.',
        variant: 'warning', duration: 8000,
      });
    } else {
      toast({
        title: 'Talian Terputus / Connection Lost',
        description: 'Mod luar talian aktif. Sesetengah ciri mungkin tidak tersedia.',
        variant: 'error', duration: 5000,
      });
    }
  }, [isOnline, isReady, toast, triggerPendingOrdersCheck]);

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
