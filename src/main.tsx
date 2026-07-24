import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// Early load mobile developer tools if activated in local storage or in the workspace preview
let erudaEnabledByUser = false;
try {
  if (typeof window !== 'undefined') {
    erudaEnabledByUser = localStorage.getItem('wawasan_eruda_enabled') === 'true';
  }
} catch (err) {
  // localStorage can throw SecurityError in sandboxed/cross-origin iframe previews
  // (e.g. AI Studio's preview iframe). Never let this crash app startup.
  console.warn('localStorage unavailable (sandboxed preview?):', err);
}

if (typeof window !== 'undefined' && erudaEnabledByUser) {
  const erudaWin = window as unknown as { eruda?: unknown };
  import('eruda')
    .then((module) => {
      if (!document.getElementById('eruda') && !erudaWin.eruda) {
        module.default.init();
      }
    })
    .catch((err) => {
      console.warn('Failed to load mobile devtools console:', err);
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Register Background Sync Service Worker (Production only to prevent caching issues in development)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isDevSandbox = 
    window.location.hostname.endsWith(".run.app") ||
    window.location.hostname.includes("aistudio") ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isDevSandbox) {
    // Actively unregister any active service workers in dev sandbox to prevent stale asset/blank screen loops
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().then(() => {
          console.log('[Service Worker] Unregistered active service worker in development sandbox');
        });
      }
    }).catch((err) => {
      console.warn('[Service Worker] Failed to unregister active service workers in dev sandbox:', err);
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[Service Worker] Registered successfully with scope:', registration.scope);
          
          // Request sync permission and register background sync if supported
          if ('sync' in registration) {
            // Attempt to register background sync for order tracking
            registration.sync.register('sync-orders')
              .then(() => console.log('[Service Worker] Registered sync tag: "sync-orders"'))
              .catch((err) => console.warn('[Service Worker] Sync registration failed:', err));
          }

          // Proactively pre-warm critical assets so the service worker caches them instantly
          const criticalAssets = [
            '/assets/batik_pattern.jpg',
            '/assets/wawasan_logo.jpg'
          ];
          criticalAssets.forEach(asset => {
            fetch(asset).catch(() => {});
          });
        })
        .catch((err) => {
          console.error('[Service Worker] Registration failed:', err);
        });
    });
  }
}

