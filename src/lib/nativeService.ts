import { Dialog } from '@capacitor/dialog';
import { AppLauncher } from '@capacitor/app-launcher';
import { LocalNotifications } from '@capacitor/local-notifications';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { isAndroidApk } from './platform';

/**
 * Native Dialog Utilities
 */
export async function showConfirm(options: {
  title: string;
  message: string;
  okButtonTitle?: string;
  cancelButtonTitle?: string;
}): Promise<boolean> {
  if (isAndroidApk()) {
    try {
      const result = await Dialog.confirm({
        title: options.title,
        message: options.message,
        okButtonTitle: options.okButtonTitle || 'OK',
        cancelButtonTitle: options.cancelButtonTitle || 'Cancel',
      });
      return result.value;
    } catch (error) {
      console.error('Error showing native confirm, falling back to web', error);
    }
  }

  // Web and AI Studio Preview fallback
  return window.confirm(`${options.title}\n\n${options.message}`);
}

export async function showAlert(options: {
  title: string;
  message: string;
  buttonTitle?: string;
}): Promise<void> {
  if (isAndroidApk()) {
    try {
      await Dialog.alert({
        title: options.title,
        message: options.message,
        buttonTitle: options.buttonTitle || 'OK',
      });
      return;
    } catch (error) {
      console.error('Error showing native alert, falling back to web', error);
    }
  }

  // Web and AI Studio Preview fallback
  window.alert(`${options.title}\n\n${options.message}`);
}

/**
 * App Launcher Utilities
 * Standardized coordinates and handles for Malaysia (WhatsApp, Waze, Maps)
 */
export async function launchWhatsApp(options: {
  phone: string; // E.g. "60123456789"
  message?: string;
}): Promise<boolean> {
  const formattedPhone = options.phone.replace(/[^\d]/g, '');
  const encodedText = options.message ? encodeURIComponent(options.message) : '';
  const urlScheme = `whatsapp://send?phone=${formattedPhone}${encodedText ? `&text=${encodedText}` : ''}`;
  const webFallback = `https://wa.me/${formattedPhone}${encodedText ? `?text=${encodedText}` : ''}`;

  if (isAndroidApk()) {
    try {
      const { value: canOpen } = await AppLauncher.canOpenUrl({ url: 'whatsapp://' });
      if (canOpen) {
        await AppLauncher.openUrl({ url: urlScheme });
        return true;
      }
    } catch (error) {
      console.error('Error checking or launching WhatsApp natively', error);
    }
  }

  // Web fallback
  window.open(webFallback, '_blank', 'noopener,noreferrer');
  return true;
}

export async function launchMaps(options: {
  lat: number;
  lng: number;
  label?: string;
  provider?: 'google' | 'waze' | 'best';
}): Promise<boolean> {
  const labelEscaped = encodeURIComponent(options.label || 'Location');
  const provider = options.provider || 'best';

  if (isAndroidApk()) {
    try {
      if (provider === 'waze') {
        const wazeUrl = `waze://?ll=${options.lat},${options.lng}&navigate=yes`;
        const { value: canOpenWaze } = await AppLauncher.canOpenUrl({ url: 'waze://' });
        if (canOpenWaze) {
          await AppLauncher.openUrl({ url: wazeUrl });
          return true;
        }
      } else if (provider === 'google') {
        const mapsUrl = `geo:${options.lat},${options.lng}?q=${options.lat},${options.lng}(${labelEscaped})`;
        await AppLauncher.openUrl({ url: mapsUrl });
        return true;
      } else {
        // 'best' - try to use general geo: URI which triggers the system chooser
        const geoUrl = `geo:${options.lat},${options.lng}?q=${options.lat},${options.lng}(${labelEscaped})`;
        await AppLauncher.openUrl({ url: geoUrl });
        return true;
      }
    } catch (error) {
      console.error('Error launching maps natively', error);
    }
  }

  // Web fallback using standard Google Maps
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${options.lat},${options.lng}`;
  window.open(webUrl, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Local Offline Notification Utilities
 */
export async function scheduleLocalNotification(options: {
  id: number;
  title: string;
  body: string;
  delaySeconds?: number;
}): Promise<boolean> {
  if (isAndroidApk()) {
    try {
      const hasPerms = await LocalNotifications.checkPermissions();
      if (hasPerms.display !== 'granted') {
        const reqPerms = await LocalNotifications.requestPermissions();
        if (reqPerms.display !== 'granted') {
          console.warn('Notification permissions denied by user');
          return false;
        }
      }

      const scheduleDate = new Date();
      scheduleDate.setSeconds(scheduleDate.getSeconds() + (options.delaySeconds || 1));

      await LocalNotifications.schedule({
        notifications: [
          {
            title: options.title,
            body: options.body,
            id: options.id,
            schedule: { at: scheduleDate },
            sound: 'default',
            attachments: [],
            actionTypeId: '',
            extra: null,
          },
        ],
      });
      return true;
    } catch (error) {
      console.error('Failed to schedule native local notification', error);
    }
  }

  // Web fallback
  console.log(`[Local Notification Fallback] ID: ${options.id} | ${options.title} - ${options.body}`);
  return true;
}

/**
 * Keep Awake / Screen Dimming Control
 */
export async function setKeepAwake(enable: boolean): Promise<boolean> {
  if (isAndroidApk()) {
    try {
      if (enable) {
        await KeepAwake.keepAwake();
      } else {
        await KeepAwake.allowSleep();
      }
      return true;
    } catch (error) {
      console.error('Failed to set keep awake natively', error);
    }
  }

  console.log(`[Keep Awake Fallback] Native keep awake state set to: ${enable}`);
  return true;
}
