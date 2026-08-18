import { getAppEnvironment, getPlatformHeaders } from './platform';

export { getAppEnvironment, getPlatformHeaders };

export const getApiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const env = getAppEnvironment();

  // 1. Android APK native environment
  if (env === 'android_apk') {
    let baseUrl = (import.meta.env.VITE_API_URL_ANDROID || import.meta.env.VITE_API_URL || '').trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // If no base URL is configured for native, attempt to use current origin if valid remote URL
    if (!baseUrl && typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.startsWith('file://')) {
       return `${window.location.origin.replace(/\/$/, '')}${cleanPath}`;
    }

    // Default fallback to production Render URL on native APK
    if (!baseUrl) {
      baseUrl = 'https://restoran-wawasan-bio.onrender.com';
    }

    return `${baseUrl}${cleanPath}`;
  }

  // 2. Web App or AI Studio Preview: Use relative paths by default to avoid CORS and domain mismatch errors
  if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file://')) {
    return cleanPath;
  }
  
  // 3. Fallback for other cases (like local file access without Capacitor)
  let baseUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!baseUrl) {
    baseUrl = 'https://restoran-wawasan-bio.onrender.com';
  }
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  return `${baseUrl}${cleanPath}`;
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const fetchCache: Record<string, CacheEntry<any>> = {};

/**
 * Perform a cached JSON fetch to optimize repeated, idempotent network calls.
 * Caches successfully resolved results for the given TTL.
 */
export async function fetchWithCache<T = any>(
  url: string,
  options?: RequestInit & { timeoutMs?: number },
  ttlMs: number = 30000 // default 30-seconds cache TTL
): Promise<T> {
  const timeoutMs = options?.timeoutMs || 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions = {
    ...options,
    signal: options?.signal || controller.signal,
  };

  // Only cache GET requests or requests without a method (which default to GET)
  const method = options?.method?.toUpperCase() || 'GET';
  if (method !== 'GET') {
    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  const serializableOptions = { ...options };
  delete serializableOptions.signal;
  delete serializableOptions.timeoutMs;
  const cacheKey = `${url}_${JSON.stringify(serializableOptions)}`;
  const now = Date.now();
  const cached = fetchCache[cacheKey];

  if (cached && now - cached.timestamp < ttlMs) {
    clearTimeout(timeoutId);
    return cached.data as T;
  }

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    
    fetchCache[cacheKey] = {
      data,
      timestamp: now,
    };

    sweepFetchCache();

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

const MAX_CACHE_ENTRIES = 50;
const DEFAULT_CACHE_SWEEP_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Sweeps the cache of entries older than TTL (default 5 minutes)
 * and trims the cache to a max capacity of 50 entries (LRU-ish based on timestamp).
 */
export function sweepFetchCache(maxAgeMs: number = DEFAULT_CACHE_SWEEP_TTL_MS) {
  const now = Date.now();
  for (const key in fetchCache) {
    if (now - fetchCache[key].timestamp > maxAgeMs) {
      delete fetchCache[key];
    }
  }
  const keys = Object.keys(fetchCache);
  if (keys.length > MAX_CACHE_ENTRIES) {
    keys.sort((a, b) => fetchCache[a].timestamp - fetchCache[b].timestamp);
    const toDelete = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);
    for (const k of toDelete) {
      delete fetchCache[k];
    }
  }
}

/**
 * Manually invalidate specific cache entries or clear all cache
 */
export function invalidateFetchCache(urlPattern?: string) {
  if (!urlPattern) {
    for (const key in fetchCache) {
      delete fetchCache[key];
    }
    return;
  }
  for (const key in fetchCache) {
    if (key.includes(urlPattern)) {
      delete fetchCache[key];
    }
  }
}


