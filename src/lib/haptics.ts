import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Debounce map to prevent rapid-fire haptic spam
const lastHapticTime: Record<string, number> = {};
const DEBOUNCE_MS = 120;

function shouldTrigger(key: string): boolean {
  const now = Date.now();
  if (now - (lastHapticTime[key] || 0) < DEBOUNCE_MS) {
    return false;
  }
  lastHapticTime[key] = now;
  return true;
}

/**
 * Triggers a light vibration, ideal for standard button taps or small interactions.
 * Debounced to prevent queue lag on rapid clicks.
 */
export async function triggerLightImpact(): Promise<void> {
  if (!shouldTrigger('light')) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Triggers a medium vibration, ideal for selection changes or slightly stronger taps.
 * Debounced to prevent queue lag on rapid clicks.
 */
export async function triggerMediumImpact(): Promise<void> {
  if (!shouldTrigger('medium')) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Triggers a heavy vibration, ideal for drag-and-drop or major interactions.
 * Debounced to prevent queue lag on rapid clicks.
 */
export async function triggerHeavyImpact(): Promise<void> {
  if (!shouldTrigger('heavy')) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Triggers a notification vibration (Success, Warning, or Error), ideal for form submissions.
 * Debounced to prevent queue lag on rapid clicks.
 */
export async function triggerNotification(type: NotificationType): Promise<void> {
  if (!shouldTrigger(`notif_${type}`)) return;
  try {
    await Haptics.notification({ type });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

export { NotificationType };
