import { useEffect } from 'react';
import { networkStatusStore } from '@/lib/networkStatusStore';
import { processBackgroundSyncQueue, cacheMenuItemsInIndexedDb } from '@/lib/indexedDbStorage';
import { getApiUrl } from '@/lib/api';
import { DEFAULT_MENU_ITEMS } from '@/constants/menu';

export function useBackgroundSync() {
  useEffect(() => {
    let isActive = true;
    let syncInFlight = false;

    // Warm the local menu cache without blocking the UI.
    void cacheMenuItemsInIndexedDb(DEFAULT_MENU_ITEMS).catch(() => {});

    // Capacitor and browser can both emit 'online' for one reconnect.
    // The single-flight gate prevents concurrent POSTs for the same queue item.
    const runSync = async () => {
      if (!isActive || syncInFlight || networkStatusStore.getSnapshot() !== true) return;
      syncInFlight = true;
      try {
        await processBackgroundSyncQueue(async (item) => {
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
      } finally {
        syncInFlight = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void runSync();
    };
    document.addEventListener('visibilitychange', onVisible);
    const unsubscribe = networkStatusStore.subscribe(() => {
      if (networkStatusStore.getSnapshot() === true) void runSync();
    });

    void runSync();

    return () => {
      isActive = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
