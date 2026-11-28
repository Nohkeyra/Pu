import { useSyncExternalStore } from 'react';
import { networkStatusStore } from '@/lib/networkStatusStore';

/** Read the shared connection state without creating another native listener. */
export function useNetworkStatus() {
  const status = useSyncExternalStore(
    networkStatusStore.subscribe,
    networkStatusStore.getSnapshot,
    () => null
  );
  return { isOnline: status ?? true, isReady: status !== null };
}
