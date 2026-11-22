import { getApiUrl, invalidateFetchCache } from './api';

/** Only disposable response caches belong to this action, never account/draft storage. */
export async function clearTemporaryAppCaches(): Promise<number> {
  invalidateFetchCache();
  if ((typeof navigator !== 'undefined' && !navigator.onLine) || typeof caches === 'undefined') return 0;
  const keys = await caches.keys();
  const deleted = await Promise.all(keys.filter(key => key.startsWith('wawasan-')).map(key => caches.delete(key)));
  return deleted.filter(Boolean).length;
}

/** Measures the actual API HTTP round-trip. A failed request has no latency reading. */
export async function measureApiLatency(signal: AbortSignal): Promise<number> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, 8000);
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const started = performance.now();
  try {
    const response = await fetch(getApiUrl('/api/health'), { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Math.round(performance.now() - started);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
