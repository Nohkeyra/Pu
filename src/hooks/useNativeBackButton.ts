import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { BackButtonListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

// Routes that are considered "top level" — pressing hardware back here should
// exit the app rather than trying to go back further, since there is nowhere
// meaningful left to return to within the SPA.
const ROOT_PATHS = ['/', '/main', '/home'];

/**
 * Wires the Android hardware/gesture back button to prioritize:
 * 1. Dismissing open overlays / modals / sheets / mobile menus (via Escape event or close button).
 * 2. Navigating back in React Router history if on a nested route.
 * 3. Exiting the native app if on a top-level root path or if browser history cannot go back.
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
        const handle = await App.addListener('backButton', ({ canGoBack }: BackButtonListenerEvent) => {
          // Priority 1: Check for active open overlays / modals in DOM
          const openOverlay = document.querySelector<HTMLElement>(
            '[role="dialog"], [role="alertdialog"], [aria-modal="true"], [data-state="open"]'
          );

          // Dispatch synthetic Escape key event to document
          const escapeEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true,
          });

          document.dispatchEvent(escapeEvent);

          if (openOverlay) {
            // Find and click any close button inside the overlay if Escape didn't unmount it instantly
            const closeBtn = openOverlay.querySelector<HTMLButtonElement>(
              'button[aria-label*="Close"], button[aria-label*="Tutup"], button[aria-label*="close"], button.icon-button-soft'
            );
            if (closeBtn) {
              closeBtn.click();
            }
            return;
          }

          // Priority 2 & 3: Check router location and history stack
          const isRootPath = ROOT_PATHS.includes(location.pathname);

          if (isRootPath || !canGoBack) {
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
