import { useEffect } from 'react';
import { App } from '@capacitor/app';
import type { URLOpenListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

import { getDeepLinkRoute } from '@/lib/appEntryRoutes';

export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isActive = true;
    let listenerHandle: PluginListenerHandle | null = null;

    const setupDeepLinks = async () => {
      try {
        const handle = await App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
          if (!isActive) return;
          
          const route = getDeepLinkRoute(event.url);
          if (route) navigate(route);
        });

        if (!isActive) {
          handle.remove();
        } else {
          listenerHandle = handle;
        }
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
