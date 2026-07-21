import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/components/ui/Toast';

export function useNativeAppState() {
  const { toast } = useToast();
  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isActive = true;

    const setupAppStateListener = async () => {
      try {
        await App.addListener('appStateChange', ({ isActive: isAppActive }) => {
          if (!isActive) return;
          
          if (!isAppActive) {
            // App went to background
            backgroundTimeRef.current = Date.now();
          } else {
            // App returned to foreground
            const now = Date.now();
            const bgTime = backgroundTimeRef.current;
            
            // If the app was in the background for more than 15 minutes, 
            // we might want to refresh data or re-authenticate silently if needed.
            // For now, we just log it and maybe show a toast if it was a very long time.
            if (bgTime && now - bgTime > 15 * 60 * 1000) {
              console.log('App returned from background after > 15 mins.');
              // Optional: trigger a data refresh event here by dispatching a custom event
              window.dispatchEvent(new Event('wawasan_app_resumed'));
            }
            backgroundTimeRef.current = null;
          }
        });
      } catch (err) {
        console.warn('Failed to listen to app state changes:', err);
      }
    };

    setupAppStateListener();

    return () => {
      isActive = false;
      App.removeAllListeners();
    };
  }, [toast]);
}
