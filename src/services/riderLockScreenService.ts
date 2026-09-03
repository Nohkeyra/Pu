import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { isAndroidApk } from '@/lib/platform';
import { launchWhatsApp, launchMaps } from '@/lib/nativeService';
import type { Order } from '@/types';

export const RIDER_NOTIFICATION_ID = 9901;
export const RIDER_ARRIVAL_NOTIFICATION_ID = 9902;
export const RIDER_CHANNEL_ID = 'rw_rider_lockscreen_channel';
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
 * Initialize notification channel and lock screen action buttons for Android
 */
export async function initializeRiderLockScreen(): Promise<boolean> {
  if (isRiderServiceInitialized) return true;

  if (isAndroidApk()) {
    try {
      // 1. Request notification permission if not yet granted
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('[RiderLockScreen] Permission denied for lockscreen notifications');
          return false;
        }
      }

      // 2. Create High-Priority Notification Channel with Lock Screen Visibility
      await LocalNotifications.createChannel({
        id: RIDER_CHANNEL_ID,
        name: 'Rider Lock Screen & Arrival Alert',
        description: 'Kawalan pantas dan butang ketibaan rider pada skrin kunci (Lock Screen)',
        importance: 5, // IMPORTANCE_HIGH / MAX
        visibility: 1, // VISIBILITY_PUBLIC (Shows full content & buttons on lockscreen!)
        sound: 'default',
        vibration: true,
        lights: true,
      });

      // 3. Register Action Types (Buttons on the Lock Screen Notification)
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: RIDER_ACTION_TYPE_ID,
            actions: [
              {
                id: 'ACTION_WHATSAPP_ARRIVAL',
                title: '💬 WhatsApp Sampai',
              },
              {
                id: 'ACTION_CALL_CUSTOMER',
                title: '📞 Hubungi Pelanggan',
              },
              {
                id: 'ACTION_OPEN_MAPS',
                title: '📍 Navigasi Maps',
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
            console.log('[RiderLockScreen] Action performed from lockscreen:', action.actionId);
            await handleRiderLockScreenAction(action.actionId);
          }
        );
      }

      isRiderServiceInitialized = true;
      return true;
    } catch (err) {
      console.error('[RiderLockScreen] Initialization error:', err);
      return false;
    }
  }

  isRiderServiceInitialized = true;
  return true;
}

/**
 * Handle actions tapped by the rider directly from the Lock Screen
 */
export async function handleRiderLockScreenAction(actionId: string): Promise<void> {
  if (!currentActiveOrder) {
    console.warn('[RiderLockScreen] No active order registered for lockscreen action');
    return;
  }

  const order = currentActiveOrder;
  const rawPhone = order.contact?.replace(/\D/g, '') || '';
  const formattedPhone = rawPhone.replace(/^0/, '60');

  switch (actionId) {
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

    case 'ACTION_COMPLETE_DELIVERY': {
      if (onDeliveredCallback) {
        onDeliveredCallback();
      }
      break;
    }

    default:
      console.log('[RiderLockScreen] Tap on notification body, bringing app to foreground');
      break;
  }
}

/**
 * Start/Update Sticky Lock Screen Notification for Delivery
 */
export async function enableRiderLockScreenWidget(
  order: Order,
  targetCoords: { lat: number; lng: number } | null,
  callbacks?: { onDelivered?: () => void }
): Promise<boolean> {
  currentActiveOrder = order;
  currentTargetCoords = targetCoords;
  if (callbacks?.onDelivered) {
    onDeliveredCallback = callbacks.onDelivered;
  }

  await initializeRiderLockScreen();

  // Prevent phone from going to sleep if mounted on motorcycle/car handlebar
  if (isAndroidApk()) {
    try {
      await KeepAwake.keepAwake();
    } catch (err) {
      console.warn('[RiderLockScreen] KeepAwake warning:', err);
    }
  }

  const invoiceNo = order.invoiceNo || order.id?.substring(0, 8).toUpperCase() || 'ORDER';
  const customerName = order.name || 'Pelanggan';
  const locationShort = (order.location || 'Destinasi').substring(0, 35);

  if (isAndroidApk()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: RIDER_NOTIFICATION_ID,
            channelId: RIDER_CHANNEL_ID,
            title: `🚚 Penghantaran #${invoiceNo} — ${customerName}`,
            body: `📍 ${locationShort}... | Tekan 'WhatsApp Sampai' pada skrin kunci bila tiba`,
            ongoing: true, // Cannot be swiped away while driving
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
      console.error('[RiderLockScreen] Failed to schedule lock screen notification:', err);
      return false;
    }
  }

  console.log(`[RiderLockScreen Web Fallback] Active for #${invoiceNo} to ${customerName}`);
  return true;
}

/**
 * Update Geofence status on the Lock Screen Widget (Heads-up alert if <= 200m)
 */
export async function updateRiderLockScreenGeofence(
  order: Order,
  targetCoords: { lat: number; lng: number } | null,
  distMeters: number | null,
  isBreached: boolean
): Promise<void> {
  currentActiveOrder = order;
  currentTargetCoords = targetCoords;

  if (!isAndroidApk()) return;

  const invoiceNo = order.invoiceNo || order.id?.substring(0, 8).toUpperCase() || 'ORDER';
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
            body: `Tekan 'WhatsApp Sampai' di bawah untuk maklumkan ${customerName} segera!`,
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
            title: `🚚 #${invoiceNo} (${distText} lagi) — ${customerName}`,
            body: `📍 ${order.location?.substring(0, 35)}... | Tekan 'WhatsApp Sampai' bila tiba`,
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
    console.warn('[RiderLockScreen] Failed to update geofence notification:', err);
  }
}

/**
 * Disable Rider Lock Screen Widget when delivery completes or modal is closed
 */
export async function disableRiderLockScreenWidget(): Promise<void> {
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
      console.warn('[RiderLockScreen] Cancel error:', err);
    }
  }
}
