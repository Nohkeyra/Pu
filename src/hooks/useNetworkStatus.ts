import { useEffect, useState, useRef } from 'react';
import { Network } from '@capacitor/network';
import { useToast } from '@/components/ui/Toast';

export function useNetworkStatus() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const prevStatusRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Initial check
    const checkStatus = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        prevStatusRef.current = status.connected;
        
        if (!status.connected) {
          toast({
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

    // Listeners
    let isActive = true;
    const setupListener = async () => {
      try {
        await Network.addListener('networkStatusChange', status => {
          if (!isActive) return;
          
          const wasOnline = prevStatusRef.current;
          const isNowOnline = status.connected;
          
          setIsOnline(isNowOnline);
          prevStatusRef.current = isNowOnline;

          // Skip if this is the first event and we are online
          if (wasOnline === null) return;
          
          // Only show toast if state actually changed
          if (wasOnline === isNowOnline) return;
          
          if (!isNowOnline) {
            toast({
              title: 'Talian Terputus / Connection Lost',
              description: 'Mod luar talian aktif. Sesetengah ciri mungkin tidak tersedia.',
              variant: 'error',
              duration: 5000
            });
          } else {
            // Only show "Restored" if we were previously offline
            if (wasOnline === false) {
              toast({
                title: 'Talian Disambung / Connection Restored',
                description: 'Anda kembali dalam talian.',
                variant: 'success',
                duration: 3000
              });
            }
          }
        });
      } catch (err) {
        console.warn('Network listener setup failed:', err);
      }
    };

    setupListener();

    return () => {
      isActive = false;
      Network.removeAllListeners();
    };
  }, [toast]);

  return { isOnline };
}
