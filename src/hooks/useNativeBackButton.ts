import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

// Routes that are considered "top level" — pressing hardware back here should
// exit the app rather than trying to go back further, since there is nowhere
// meaningful left to return to within the SPA.
const ROOT_PATHS = ['/', '/main', '/home'];

/**
 * Wires the Android hardware/gesture back button to React Router's own
 * navigation history instead of the native WebView's canGoBack()/goBack().
 */
export function useNativeBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let active = true;
    let listenerHandle: PluginListenerHandle | null = null;

    const setupListener = async () => {
      try {
        const handle = await App.addListener('backButton', () => {
          // Exit if we are on a root path, or if we are at the very bottom of the history stack
          const isAtRootHistory = window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx === 0;
          
          if (ROOT_PATHS.includes(location.pathname) || isAtRootHistory) {
            App.exitApp();
          } else {
            navigate(-1);
          }
        });
        if (!active) {
          handle.remove();
        } else {
          listenerHandle = handle;
        }
      } catch (err) {
        console.error('Failed to setup backButton listener:', err);
      }
    };

    setupListener();

    return () => {
      active = false;
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate, location.pathname]);
}
