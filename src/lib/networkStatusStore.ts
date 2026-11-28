import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

type Cleanup = () => void | Promise<void>;
interface NetworkSource {
  read: () => Promise<boolean>;
  listen: (publish: (online: boolean) => void) => Promise<Cleanup>;
}

/** A single connection observer shared by every subscriber. Null means not yet observed. */
export function createNetworkStatusStore(source: NetworkSource) {
  let snapshot: boolean | null = null;
  let stop: Cleanup | undefined;
  let generation = 0;
  const subscribers = new Set<() => void>();

  function start() {
    const current = ++generation;
    let eventReceived = false;
    const active = () => current === generation && subscribers.size > 0;
    const publish = (online: boolean) => {
      if (!active() || snapshot === online) return;
      snapshot = online;
      for (const subscriber of [...subscribers]) subscriber();
    };
    void (async () => {
      try {
        const cleanup = await source.listen(online => {
          eventReceived = true;
          publish(online);
        });
        if (!active()) { await cleanup(); return; }
        stop = cleanup;
      } catch (error) {
        if (active()) console.warn('[Network] Listener setup failed:', error);
      }
      if (!active()) return;
      try {
        const online = await source.read();
        // An event arriving during the initial read is newer than its result.
        if (!eventReceived) publish(online);
      } catch (error) {
        if (active()) console.warn('[Network] Initial status unavailable:', error);
      }
    })();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(subscriber: () => void) {
      subscribers.add(subscriber);
      if (subscribers.size === 1) start();
      return () => {
        if (!subscribers.delete(subscriber) || subscribers.size) return;
        generation++;
        snapshot = null;
        const cleanup = stop;
        stop = undefined;
        if (cleanup) void Promise.resolve().then(cleanup).catch(error => {
          console.warn('[Network] Listener cleanup failed:', error);
        });
      };
    },
  };
}

function browserListener(publish: (online: boolean) => void): Cleanup {
  const online = () => publish(true);
  const offline = () => publish(false);
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  return () => {
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
  };
}

// Native plugin is authoritative on APK; browser events are authoritative on web.
// Fall back to browser events if the native plugin cannot register.
export const networkStatusStore = createNetworkStatusStore({
  async read() {
    if (Capacitor.isNativePlatform()) {
      try { return (await Network.getStatus()).connected; }
      catch { /* Browser connectivity is the fallback. */ }
    }
    return navigator.onLine;
  },
  async listen(publish) {
    if (Capacitor.isNativePlatform()) {
      try {
        const handle = await Network.addListener('networkStatusChange', status => publish(status.connected));
        return () => handle.remove();
      } catch (error) {
        console.warn('[Network] Native listener unavailable, using browser events:', error);
      }
    }
    return browserListener(publish);
  },
});
