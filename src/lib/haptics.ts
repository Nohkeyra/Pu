import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Debounce map to prevent rapid-fire haptic spam
const lastHapticTime: Record<string, number> = {};
const DEBOUNCE_MS = 120;
const MAX_DEBOUNCE_KEYS = 20;

function cleanupHapticKeys() {
  const keys = Object.keys(lastHapticTime);
  if (keys.length > MAX_DEBOUNCE_KEYS) {
    const now = Date.now();
    // Opportunistic cleanup: delete keys older than 10 seconds
    for (const k of keys) {
      if (now - lastHapticTime[k] > 10000) {
        delete lastHapticTime[k];
      }
    }
    // If still over cap, delete oldest entries
    const remaining = Object.keys(lastHapticTime);
    if (remaining.length > MAX_DEBOUNCE_KEYS) {
      remaining.sort((a, b) => lastHapticTime[a] - lastHapticTime[b]);
      const toRemove = remaining.slice(0, remaining.length - MAX_DEBOUNCE_KEYS);
      for (const k of toRemove) {
        delete lastHapticTime[k];
      }
    }
  }
}

function shouldTrigger(key: string): boolean {
  const now = Date.now();
  if (now - (lastHapticTime[key] || 0) < DEBOUNCE_MS) {
    return false;
  }
  lastHapticTime[key] = now;
  cleanupHapticKeys();
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
