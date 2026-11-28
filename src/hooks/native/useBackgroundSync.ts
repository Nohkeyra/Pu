import { useEffect } from 'react';
import { networkStatusStore } from '@/lib/networkStatusStore';
import { processBackgroundSyncQueue } from '@/lib/indexedDbStorage';
import { getApiUrl } from '@/lib/api';
// Shared across StrictMode replays and component remounts.
let syncInFlight: Promise<unknown> | null = null;

export function useBackgroundSync() {
  useEffect(() => {
    let isActive = true;

    // Capacitor and browser can both emit 'online' for one reconnect.
    // The single-flight gate prevents concurrent POSTs for the same queue item.
    const runSync = async () => {
      if (!isActive || syncInFlight || networkStatusStore.getSnapshot() !== true) return;
      const flight = processBackgroundSyncQueue(async (item) => {
          if (!isActive) return 'skip';
          try {
            if (item.type === 'contact_inquiry') {
              const res = await fetch(getApiUrl('/api/inquiries'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload),
              });
              return res.ok;
            }
            // Offline orders still require explicit customer review and confirmation.
            return 'unsupported';
          } catch {
            return false;
          }
      });
      syncInFlight = flight;
      try {
        await flight;
      } finally {
        if (syncInFlight === flight) syncInFlight = null;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void runSync();
    };
    document.addEventListener('visibilitychange', onVisible);
    const unsubscribe = networkStatusStore.subscribe(() => {
      if (networkStatusStore.getSnapshot() === true) void runSync();
    });

    // A replay may mount while the previous effect is closing its database.
    // Re-evaluate once that flight finishes instead of waiting for another reconnect.
    const previousFlight = syncInFlight;
    if (previousFlight) void previousFlight.then(runSync, runSync);
    else void runSync();

    return () => {
      isActive = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
