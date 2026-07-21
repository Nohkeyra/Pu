import { useNativeAppState } from '@/hooks/useNativeAppState';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useDeepLinks } from '@/hooks/useDeepLinks';

/**
 * An invisible component that wraps native listeners 
 * so they have access to React context (like useToast)
 */
function NativeAppListeners() {
  useNativeAppState();
  useNetworkStatus();
  useDeepLinks();
  
  return null;
}

export default NativeAppListeners;
