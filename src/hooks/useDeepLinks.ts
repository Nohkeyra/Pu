import { useEffect } from 'react';
import { App } from '@capacitor/app';
import type { URLOpenListenerEvent } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isActive = true;

    const setupDeepLinks = async () => {
      try {
        await App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
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
              navigate(cleanPath);
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
      App.removeAllListeners();
    };
  }, [navigate]);
}
