import { Capacitor } from '@capacitor/core';

export const getApiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const isNative = Capacitor.isNativePlatform();

  // 1. If it's a native app, use the Android-specific URL or fallback to the general one
  if (isNative) {
    let baseUrl = (import.meta.env.VITE_API_URL_ANDROID || import.meta.env.VITE_API_URL || '').trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // If no base URL is configured for native, attempt to use current origin if valid remote URL
    if (!baseUrl && typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.startsWith('file://')) {
       return `${window.location.origin.replace(/\/$/, '')}${cleanPath}`;
    }

    return `${baseUrl}${cleanPath}`;
  }

  // 2. For Web: Use relative paths by default to avoid CORS and domain mismatch errors
  if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file://')) {
    return cleanPath;
  }
  
  // 3. Fallback for other cases (like local file access without Capacitor)
  let baseUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  return `${baseUrl}${cleanPath}`;
};
