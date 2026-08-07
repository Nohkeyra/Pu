import { useEffect } from 'react';
import { App } from '@capacitor/app';
import type { URLOpenListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

// F-35 (audit): NOTE — as of this audit, AndroidManifest.xml declares no
// intent-filter for any custom scheme or App Link, so Android has no way to
// actually deliver a URL to this listener; this hook is currently dead code
// on Android. Kept working and hardened anyway in case a scheme/App Link
// intent-filter is added later, since at that point this becomes live,
// externally-reachable input. Previously `navigate(cleanPath)` accepted
// any path parsed out of the incoming URL with no validation — allow-list
// it to the app's known routes so an attacker-crafted deep link can only
// ever land on a route the app already exposes, never an arbitrary string.
const ALLOWED_DEEP_LINK_ROUTES = new Set(['/order', '/admin', '/login', '/profile', '/settings', '/']);

function sanitizeDeepLinkPath(path: string): string | null {
  // Strip query/hash for the allow-list check; React Router only needs the
  // path segment here since callers already fold hash/search into `path`.
  const base = path.split('?')[0].split('#')[0] || '/';
  return ALLOWED_DEEP_LINK_ROUTES.has(base) ? path : null;
}

export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isActive = true;
    let listenerHandle: PluginListenerHandle | null = null;

    const setupDeepLinks = async () => {
      try {
        listenerHandle = await App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
          if (!isActive) return;
          
          console.log('App opened with URL:', event.url);
          
          // Example: restoran-wawasan-bio.onrender.com/order
          // Or custom scheme: wawasan://app/order
          try {
            const url = new URL(event.url);
            
            // If using a custom scheme (wawasan://) or a specific domain
            // Extract the path and navigate
            let path = url.pathname;
            if (url.hash) {
                path += url.hash;
            }
            if (url.search) {
                path += url.search;
            }
            
            // Fallback for custom schemes where pathname might just be the host part 
            // e.g. wawasan://order -> host is 'order'
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                path = '/' + url.host + url.pathname + url.search + url.hash;
            }

            if (path && path !== '/') {
              // We want to route the user within the React app
              // For hash router, it might look like /#/order, so navigate to /order
              const cleanPath = path.replace('/#', '');
              const safePath = sanitizeDeepLinkPath(cleanPath);
              if (safePath) {
                navigate(safePath);
              } else {
                console.warn('Ignored deep link to unrecognized route:', cleanPath);
              }
            }
          } catch (e) {
            console.warn('Failed to parse deep link url:', e);
          }
        });
      } catch (err) {
        console.warn('Failed to setup deep links:', err);
      }
    };

    setupDeepLinks();

    return () => {
      isActive = false;
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate]);
}
