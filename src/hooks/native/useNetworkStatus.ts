import { useEffect, useState, useRef } from 'react';
import { Network } from '@capacitor/network';
import { useToast } from '@/components/ui/Toast';

export function useNetworkStatus() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const prevStatusRef = useRef<boolean | null>(null);
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    // Initial check
    const checkStatus = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        prevStatusRef.current = status.connected;
        
        if (!status.connected) {
          toastRef.current({
            title: 'Tiada Internet / No Internet',
            description: 'Sila periksa sambungan rangkaian anda / Please check your connection.',
            variant: 'warning',
            duration: 8000
          });
        }
      } catch (err) {
        console.warn('Network status check failed:', err);
      }
    };

    checkStatus();

    // Setup both Capacitor Network plugin listener and Web window listeners
    let isActive = true;
    let listenerHandle: { remove: () => void } | null = null;

    const handleStatusChange = (isNowOnline: boolean) => {
      if (!isActive) return;
      const wasOnline = prevStatusRef.current;
      
      setIsOnline(isNowOnline);
      prevStatusRef.current = isNowOnline;

      if (wasOnline === null || wasOnline === isNowOnline) return;

      if (!isNowOnline) {
        toastRef.current({
          title: 'Talian Terputus / Connection Lost',
          description: 'Mod luar talian aktif. Sesetengah ciri mungkin tidak tersedia.',
          variant: 'error',
          duration: 5000
        });
      } else {
        if (wasOnline === false) {
          toastRef.current({
            title: 'Talian Disambung / Connection Restored',
            description: 'Anda kembali dalam talian.',
            variant: 'success',
            duration: 3000
          });
        }
      }
    };

    const setupListener = async () => {
      try {
        const handle = await Network.addListener('networkStatusChange', status => {
          handleStatusChange(status.connected);
        });

        if (!isActive) {
          handle.remove();
        } else {
          listenerHandle = handle;
        }
      } catch (err) {
        console.warn('Network listener setup failed:', err);
      }
    };

    const onWebOnline = () => handleStatusChange(true);
    const onWebOffline = () => handleStatusChange(false);

    window.addEventListener('online', onWebOnline);
    window.addEventListener('offline', onWebOffline);

    setupListener();

    return () => {
      isActive = false;
      if (listenerHandle) {
        listenerHandle.remove();
      }
      window.removeEventListener('online', onWebOnline);
      window.removeEventListener('offline', onWebOffline);
    };
  }, []);

  return { isOnline };
}
