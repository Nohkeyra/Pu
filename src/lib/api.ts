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


