import { useNativeNotifications } from '@/hooks/useNativeNotifications';

function PushNotificationHandler() {
  useNativeNotifications();
  return null;
}

export default PushNotificationHandler;

