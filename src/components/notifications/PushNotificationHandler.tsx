import { useNativeNotifications } from '@/hooks/native/useNativeNotifications';

function PushNotificationHandler() {
  useNativeNotifications();
  return null;
}

export default PushNotificationHandler;

