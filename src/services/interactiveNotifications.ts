import { LocalNotifications, type ActionPerformed, type ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { triggerNotification, NotificationType } from '@/lib/haptics';

export const NOTIFICATION_ACTION_TYPES = {
  ORDER_TRACKING: 'ORDER_TRACKING_ACTIONS',
  REMINDER: 'REMINDER_ACTIONS',
};

/**
 * Initializes interactive notification categories with actionable response buttons
 */
export async function initInteractiveNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Register interactive action buttons for local notifications
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: NOTIFICATION_ACTION_TYPES.ORDER_TRACKING,
          actions: [
            {
              id: 'view_order',
              title: 'Lihat Tempahan / View Order',
              foreground: true,
            },
            {
              id: 'open_map',
              title: 'Buka Peta / Open Map',
              foreground: true,
            },
          ],
        },
        {
          id: NOTIFICATION_ACTION_TYPES.REMINDER,
          actions: [
            {
              id: 'view_details',
              title: 'Butiran / Details',
              foreground: true,
            },
            {
              id: 'dismiss',
              title: 'Tutup / Dismiss',
              destructive: true,
            },
          ],
        },
      ],
    });

    // Listen for notification action clicks
    LocalNotifications.addListener('localNotificationActionPerformed', (notification: ActionPerformed) => {
      const actionId = notification.actionId;
      const extra = notification.notification.extra;

      if (actionId === 'view_order') {
        window.location.hash = '#/track';
      } else if (actionId === 'open_map') {
        window.location.hash = '#/track?view=map';
      } else if (actionId === 'view_details') {
        if (extra?.targetUrl) {
          window.location.hash = extra.targetUrl;
        } else {
          window.location.hash = '#/';
        }
      }
    });
  } catch (err) {
    console.debug('Failed to initialize interactive notification types:', err);
  }
}

/**
 * Dispatches an immediate interactive local notification with action buttons
 */
export async function sendInteractiveNotification(options: {
  id?: number;
  title: string;
  body: string;
  actionTypeId?: string;
  extra?: Record<string, unknown>;
}): Promise<void> {
  triggerNotification(NotificationType.Success);

  if (!Capacitor.isNativePlatform()) {
    // In Web environment, fallback to standard Web Notification API if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(options.title, {
          body: options.body,
          icon: '/assets/icons/icon-192.webp',
        });
      } catch {
        /* ignore */
      }
    }
    return;
  }

  try {
    const notifId = options.id || Math.floor(Date.now() % 100000);
    const scheduleOptions: ScheduleOptions = {
      notifications: [
        {
          id: notifId,
          title: options.title,
          body: options.body,
          actionTypeId: options.actionTypeId || NOTIFICATION_ACTION_TYPES.ORDER_TRACKING,
          extra: options.extra || {},
          smallIcon: 'ic_stat_name',
          iconColor: '#0c453c',
          sound: 'default',
        },
      ],
    };

    await LocalNotifications.schedule(scheduleOptions);
  } catch (err) {
    console.debug('Failed to schedule interactive notification:', err);
  }
}
