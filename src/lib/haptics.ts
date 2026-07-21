import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Triggers a light vibration, ideal for standard button taps or small interactions.
 */
export async function triggerLightImpact(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Triggers a medium vibration, ideal for selection changes or slightly stronger taps.
 */
export async function triggerMediumImpact(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Triggers a heavy vibration, ideal for drag-and-drop or major interactions.
 */
export async function triggerHeavyImpact(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Triggers a notification vibration (Success, Warning, or Error), ideal for form submissions.
 */
export async function triggerNotification(type: NotificationType): Promise<void> {
  try {
    await Haptics.notification({ type });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

export { NotificationType };
