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
  options?: RequestInit,
  ttlMs: number = 30000 // default 30-seconds cache TTL
): Promise<T> {
  // Only cache GET requests or requests without a method (which default to GET)
  const method = options?.method?.toUpperCase() || 'GET';
  if (method !== 'GET') {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  const cacheKey = `${url}_${JSON.stringify(options || {})}`;
  const now = Date.now();
  const cached = fetchCache[cacheKey];

  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  const data = await response.json();
  
  fetchCache[cacheKey] = {
    data,
    timestamp: now,
  };

  return data as T;
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


