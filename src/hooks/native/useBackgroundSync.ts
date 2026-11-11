import { useEffect } from 'react';
import { Network } from '@capacitor/network';
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
      if (!isActive || syncInFlight || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
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

    const onOnline = () => { void runSync(); };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void runSync();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    let networkListenerHandle: { remove: () => void } | null = null;
    void Network.addListener('networkStatusChange', (status) => {
      if (status.connected) void runSync();
    }).then((handle) => {
      if (!isActive) {
        void handle.remove();
      } else {
        networkListenerHandle = handle;
      }
    }).catch(() => {});

    void runSync();

    return () => {
      isActive = false;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      if (networkListenerHandle) void networkListenerHandle.remove();
    };
  }, []);
}
