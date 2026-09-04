import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { isAndroidApk } from '@/lib/platform';
import { launchWhatsApp, launchMaps } from '@/lib/nativeService';
import type { Order } from '@/types';

export const RIDER_NOTIFICATION_ID = 9901;
export const RIDER_ARRIVAL_NOTIFICATION_ID = 9902;
export const RIDER_CHANNEL_ID = 'rw_rider_delivery_channel';
export const RIDER_ACTION_TYPE_ID = 'RW_RIDER_DELIVERY_ACTIONS';

let isRiderServiceInitialized = false;
let actionListenerHandle: PluginListenerHandle | null = null;
let currentActiveOrder: Order | null = null;
let currentTargetCoords: { lat: number; lng: number } | null = null;
let onDeliveredCallback: (() => void) | null = null;

/**
 * Format the standard arrival WhatsApp message
 */
export function buildArrivalMessage(order: Order, lang: 'en' | 'bm' = 'bm'): string {
  const isBm = lang === 'bm';
  const name = order.name || 'Pelanggan';
  const location = order.location || 'Lokasi Tempahan';

  if (isBm) {
    return `Salam ${name},\n\nSaya rider dari *Restoran Wawasan Pak Usop* sedang menghantar hidangan katering anda.\n\nSaya kini telah tiba di hadapan / lingkungan *200 meter* ke lokasi majlis:\n📍 *${location}*\n\nSila bersiap sedia untuk menerima penghantaran. Terima kasih! 🚚✨`;
  }

  return `Hello ${name},\n\nI am the catering delivery rider from *Restoran Wawasan Pak Usop*.\n\nI have arrived at the gate / within *200 meters* of your event location:\n📍 *${location}*\n\nPlease be ready to receive your catering feast. Thank you! 🚚✨`;
}

/**
 * Initialize notification channel and action buttons for Android
 */
export async function initializeRiderDeliveryService(): Promise<boolean> {
  if (isRiderServiceInitialized) return true;

  if (isAndroidApk()) {
    try {
      // 1. Request notification permission if not yet granted
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('[RiderDeliveryWidget] Permission denied for delivery notifications');
          return false;
        }
      }

      // 2. Create High-Priority Notification Channel
      await LocalNotifications.createChannel({
        id: RIDER_CHANNEL_ID,
        name: 'Rider Delivery & Arrival Alert',
        description: 'Kawalan pantas dan butang ketibaan rider penghantaran',
        importance: 5, // IMPORTANCE_HIGH / MAX
        visibility: 1, // VISIBILITY_PUBLIC
        sound: 'default',
        vibration: true,
        lights: true,
      });

      // 3. Register Action Types (Delivered, WhatsApp, Call)
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: RIDER_ACTION_TYPE_ID,
            actions: [
              {
                id: 'ACTION_COMPLETE_DELIVERY',
                title: '✅ Selesai Hantar (Delivered)',
              },
              {
                id: 'ACTION_WHATSAPP_ARRIVAL',
                title: '💬 WhatsApp',
              },
              {
                id: 'ACTION_CALL_CUSTOMER',
                title: '📞 Telefon',
              },
            ],
          },
        ],
      });

      // 4. Attach action listener
      if (!actionListenerHandle) {
        actionListenerHandle = await LocalNotifications.addListener(
          'localNotificationActionPerformed',
          async (action: ActionPerformed) => {
            console.log('[RiderDeliveryWidget] Action performed:', action.actionId);
            await handleRiderWidgetAction(action.actionId);
          }
        );
      }

      isRiderServiceInitialized = true;
      return true;
    } catch (err) {
      console.error('[RiderDeliveryWidget] Initialization error:', err);
      return false;
    }
  }

  isRiderServiceInitialized = true;
  return true;
}

/**
 * Handle actions tapped by the rider
 */
export async function handleRiderWidgetAction(actionId: string): Promise<void> {
  if (!currentActiveOrder) {
    console.warn('[RiderDeliveryWidget] No active order registered for action');
    return;
  }

  const order = currentActiveOrder;
  const rawPhone = order.contact?.replace(/\D/g, '') || '';
  const formattedPhone = rawPhone.replace(/^0/, '60');

  switch (actionId) {
    case 'ACTION_COMPLETE_DELIVERY': {
      if (onDeliveredCallback) {
        onDeliveredCallback();
      }
      break;
    }

    case 'ACTION_WHATSAPP_ARRIVAL': {
      const msg = buildArrivalMessage(order, 'bm');
      await launchWhatsApp({
        phone: formattedPhone || '60173157731',
        message: msg,
      });
      break;
    }

    case 'ACTION_CALL_CUSTOMER': {
      if (formattedPhone) {
        window.open(`tel:${formattedPhone}`, '_system');
      }
      break;
    }

    case 'ACTION_OPEN_MAPS': {
      if (currentTargetCoords) {
        await launchMaps({
          lat: currentTargetCoords.lat,
          lng: currentTargetCoords.lng,
          label: order.location || 'Lokasi Pelanggan',
        });
      }
      break;
    }

    default:
      console.log('[RiderDeliveryWidget] Tap on notification body, bringing app to foreground');
      break;
  }
}

/**
 * Start/Update Active Delivery Tracking Notification
 */
export async function enableRiderDeliveryWidget(
  order: Order,
  targetCoords: { lat: number; lng: number } | null,
  callbacks?: { onDelivered?: () => void }
): Promise<boolean> {
  currentActiveOrder = order;
  currentTargetCoords = targetCoords;
  if (callbacks?.onDelivered) {
    onDeliveredCallback = callbacks.onDelivered;
  }

  await initializeRiderDeliveryService();

  // Prevent phone from sleeping if mounted on motorcycle/car
  if (isAndroidApk()) {
    try {
      await KeepAwake.keepAwake();
    } catch (err) {
      console.warn('[RiderDeliveryWidget] KeepAwake warning:', err);
    }
  }

  const customerName = order.name || 'Pelanggan';
  const locationShort = (order.location || 'Destinasi').substring(0, 35);

  if (isAndroidApk()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: RIDER_NOTIFICATION_ID,
            channelId: RIDER_CHANNEL_ID,
            title: `🚚 Penghantaran: ${customerName}`,
            body: `📍 ${locationShort}... | Tekan 'Selesai Hantar' bila pesanan diserahkan`,
            ongoing: true,
            autoCancel: false,
            actionTypeId: RIDER_ACTION_TYPE_ID,
            sound: 'default',
            extra: {
              orderId: order.id,
              phone: order.contact,
              name: order.name,
              location: order.location,
            },
          },
        ],
      });
      return true;
    } catch (err) {
      console.error('[RiderDeliveryWidget] Failed to schedule notification:', err);
      return false;
    }
  }

  console.log(`[RiderDeliveryWidget Web Fallback] Active for ${customerName}`);
  return true;
}

/**
 * Update Geofence status on the Delivery Widget (Heads-up alert if <= 200m)
 */
export async function updateRiderDeliveryWidgetGeofence(
  order: Order,
  targetCoords: { lat: number; lng: number } | null,
  distMeters: number | null,
  isBreached: boolean
): Promise<void> {
  currentActiveOrder = order;
  currentTargetCoords = targetCoords;

  if (!isAndroidApk()) return;

  const customerName = order.name || 'Pelanggan';

  try {
    if (isBreached) {
      // High-priority urgent arrival notification with sound & vibration
      await LocalNotifications.schedule({
        notifications: [
          {
            id: RIDER_ARRIVAL_NOTIFICATION_ID,
            channelId: RIDER_CHANNEL_ID,
            title: `🚨 ANDA DAH SAMPAI! (Lingkungan 200m)`,
            body: `Tekan 'Selesai Hantar (Delivered)' untuk maklumkan ${customerName} melalui notifikasi aplikasi!`,
            ongoing: false,
            autoCancel: true,
            actionTypeId: RIDER_ACTION_TYPE_ID,
            sound: 'default',
            extra: {
              orderId: order.id,
              phone: order.contact,
              name: order.name,
              location: order.location,
            },
          },
        ],
      });
    } else if (distMeters !== null) {
      // Update ongoing notification with current distance remaining
      const distText = distMeters > 1000 ? `${(distMeters / 1000).toFixed(1)} km` : `${distMeters} m`;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: RIDER_NOTIFICATION_ID,
            channelId: RIDER_CHANNEL_ID,
            title: `🚚 ${customerName} (${distText} lagi)`,
            body: `📍 ${order.location?.substring(0, 35)}... | Tekan 'Selesai Hantar' bila pesanan diserahkan`,
            ongoing: true,
            autoCancel: false,
            actionTypeId: RIDER_ACTION_TYPE_ID,
            extra: {
              orderId: order.id,
              phone: order.contact,
              name: order.name,
              location: order.location,
            },
          },
        ],
      });
    }
  } catch (err) {
    console.warn('[RiderDeliveryWidget] Failed to update geofence notification:', err);
  }
}

/**
 * Disable Rider Delivery Widget when delivery completes or modal is closed
 */
export async function disableRiderDeliveryWidget(): Promise<void> {
  currentActiveOrder = null;
  currentTargetCoords = null;
  onDeliveredCallback = null;

  if (isAndroidApk()) {
    try {
      await KeepAwake.allowSleep();
    } catch {
      // Ignore
    }

    try {
      await LocalNotifications.cancel({
        notifications: [
          { id: RIDER_NOTIFICATION_ID },
          { id: RIDER_ARRIVAL_NOTIFICATION_ID },
        ],
      });
    } catch (err) {
      console.warn('[RiderDeliveryWidget] Cancel error:', err);
    }
  }
}

// Backwards compatibility aliases
export const enableRiderLockScreenWidget = enableRiderDeliveryWidget;
export const disableRiderLockScreenWidget = disableRiderDeliveryWidget;
export const updateRiderLockScreenGeofence = updateRiderDeliveryWidgetGeofence;
export const initializeRiderLockScreen = initializeRiderDeliveryService;
export const handleRiderLockScreenAction = handleRiderWidgetAction;
