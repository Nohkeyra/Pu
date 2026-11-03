import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import type { BackButtonListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/components/ui/Toast';

// Routes that are considered "top level" — pressing hardware back here should
// exit the app rather than trying to go back further, since there is nowhere
// meaningful left to return to within the SPA.
const ROOT_PATHS = ['/', '/main', '/home', '/login'];

/**
 * Wires the Android hardware/gesture back button to prioritize:
 * 1. Dismissing open overlays / modals / sheets / mobile menus (via Escape event or close button).
 * 2. Navigating back in React Router history if on a nested route.
 * 3. Double-tapping to minimize the native app if on a top-level root path.
 */
export function useNativeBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const lastBackPressRef = useRef<number>(0);

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
            const now = Date.now();
            const timeDiff = now - lastBackPressRef.current;
            
            if (timeDiff < 2000) {
              // Double tapped within 2 seconds -> minimize app
              App.minimizeApp();
            } else {
              lastBackPressRef.current = now;
              toast({
                title: 'Sentuh sekali lagi untuk keluar',
                description: 'Tekan sekali lagi untuk menutup aplikasi secara latar belakang. / Press back again to minimize the app.',
                variant: 'info',
                duration: 2000,
              });
            }
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
  }, [navigate, location.pathname, toast]);
}
