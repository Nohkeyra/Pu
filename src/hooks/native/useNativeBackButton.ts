import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { useMobileKeyboard } from './useMobileKeyboard';
import type { BackButtonListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/components/ui/Toast';

// Routes that are considered "top level" — pressing hardware back here should
// exit the app rather than trying to go back further, since there is nowhere
// meaningful left to return to within the SPA.
const ROOT_PATHS = ['/', '/main', '/home', '/login', '/app'];

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
  const { isKeyboardVisible } = useMobileKeyboard();
  // Keep the native callback stable while reading the latest IME state.
  const keyboardVisibleRef = useRef(isKeyboardVisible);
  useEffect(() => {
    keyboardVisibleRef.current = isKeyboardVisible;
  }, [isKeyboardVisible]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let active = true;
    let listenerHandle: PluginListenerHandle | null = null;

    const setupListener = async () => {
      try {
        const handle = await App.addListener('backButton', ({ canGoBack }: BackButtonListenerEvent) => {
          // The first Back press while typing should dismiss the IME, not leave the order.
          if (keyboardVisibleRef.current) {
            void Keyboard.hide().catch(() => { /* Android normally hides the IME itself. */ });
            (document.activeElement as HTMLElement | null)?.blur?.();
            return;
          }

          // An open modal takes precedence over the form wizard and router.
          // Exclude unrelated `data-state="open"` controls such as accordions.
          const openOverlay = Array.from(document.querySelectorAll<HTMLElement>(
            '[role="dialog"], [role="alertdialog"], [aria-modal="true"]'
          )).find(element => element.getClientRects().length > 0);

          if (openOverlay) {
            const closeButton = openOverlay.querySelector<HTMLButtonElement>(
              '[data-slot="dialog-close"], button[aria-label*="close" i], button[aria-label*="tutup" i]'
            );
            if (closeButton && !closeButton.disabled) {
              closeButton.click();
            } else {
              // Some custom overlays only register Escape; never navigate
              // underneath an overlay that is still visible.
              document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Escape', code: 'Escape', bubbles: true, cancelable: true,
              }));
            }
            return;
          }

          // OrderForm can consume the hardware Back for its own step navigation.
          // There is exactly ONE Capacitor backButton listener in the app.
          const orderBack = new Event('wawasan:order-step-back', { cancelable: true });
          document.dispatchEvent(orderBack);
          if (orderBack.defaultPrevented) return;

          // Priority 2 & 3: Check router location and history stack
          const isRootPath = ROOT_PATHS.includes(location.pathname);

          if (isRootPath) {
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
          } else if (canGoBack) {
            navigate(-1);
          } else {
            // Directly launched deep links have no browser history to return to.
            navigate('/home', { replace: true });
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
