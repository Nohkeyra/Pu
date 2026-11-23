import { useEffect } from 'react';
import { App } from '@capacitor/app';
import type { URLOpenListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

import { getDeepLinkRoute, getPushNotificationRoute } from '@/lib/appEntryRoutes';

export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isActive = true;
    let listenerHandle: PluginListenerHandle | null = null;
    const onPushAction = (event: Event) => {
      if (!isActive) return;
      const route = getPushNotificationRoute((event as CustomEvent<unknown>).detail);
      if (route) navigate(route);
    };
    window.addEventListener('wawasan:push_action', onPushAction);

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
      window.removeEventListener('wawasan:push_action', onPushAction);
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate]);
}
