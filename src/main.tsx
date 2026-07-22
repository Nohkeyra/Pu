import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// Early load mobile developer tools if activated in local storage or in the workspace preview
const isWorkspace = typeof window !== 'undefined' && (
  window.location.hostname.endsWith(".run.app") ||
  window.location.hostname.includes("aistudio") ||
  (window.location.hostname === "localhost" && window.location.port === "3000") ||
  (window.location.hostname === "127.0.0.1" && window.location.port === "3000")
);

if (typeof window !== 'undefined' && (localStorage.getItem('wawasan_eruda_enabled') === 'true' || isWorkspace)) {
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

// Register Background Sync Service Worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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

