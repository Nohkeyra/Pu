import { useEffect } from 'react';
import { Network } from '@capacitor/network';
import { processBackgroundSyncQueue, cacheMenuItemsInIndexedDb } from '@/lib/indexedDbStorage';
import { getApiUrl } from '@/lib/api';
import { DEFAULT_MENU_ITEMS } from '@/constants/menu';

export function useBackgroundSync() {
  useEffect(() => {
    // 1. Initial warm up of IndexedDB menu cache
    cacheMenuItemsInIndexedDb(DEFAULT_MENU_ITEMS).catch(() => {});

    // 2. Synchronize queue when online
    const runSync = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

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
          return true;
        } catch {
          return false;
        }
      });
    };

    // Listen for Web network changes
    window.addEventListener('online', runSync);

    // Listen for Capacitor Native network changes
    let networkListenerHandle: { remove: () => void } | null = null;
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) {
        runSync();
      }
    }).then((handle) => {
      networkListenerHandle = handle;
    }).catch(() => {});

    // Run once on mount if already connected
    runSync();

    return () => {
      window.removeEventListener('online', runSync);
      networkListenerHandle?.remove();
    };
  }, []);
}
