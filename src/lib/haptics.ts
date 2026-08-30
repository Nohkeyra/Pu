import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Debounce map to prevent rapid-fire haptic spam
const lastHapticTime: Record<string, number> = {};
const DEBOUNCE_MS = 120;
const MAX_DEBOUNCE_KEYS = 20;

// Web Audio API Sound Synthesizer for Touch & Click Sound Effects
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (e) {
    console.debug('Failed to initialize AudioContext:', e);
  }
  return audioCtx;
}

/**
 * Synthesizes a crisp, clear UI click/tap sound using Web Audio API.
 * Works seamlessly across browser and native WebView without external sound files.
 */
export function playClickSound(soundType: 'light' | 'medium' | 'heavy' | 'notification' | 'force' = 'light') {
  try {
    const isSoundEnabled = localStorage.getItem('wawasan_sound_effects_enabled') === 'true';
    if (!isSoundEnabled && soundType !== 'force') return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (soundType === 'light' || soundType === 'force') {
      // High crisp snap sound (850Hz -> 320Hz pop in 35ms)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (soundType === 'medium') {
      // Warm wood-tap tone (650Hz -> 200Hz in 50ms)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (soundType === 'heavy') {
      // Deeper tactile thud tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.07);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (soundType === 'notification') {
      // Pleasant dual chime (C5 to E5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.05);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (err) {
    console.debug('Audio click sound error:', err);
  }
}

function cleanupHapticKeys() {
  const keys = Object.keys(lastHapticTime);
  if (keys.length > MAX_DEBOUNCE_KEYS) {
    const now = Date.now();
    for (const k of keys) {
      if (now - lastHapticTime[k] > 10000) {
        delete lastHapticTime[k];
      }
    }
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
 * Triggers a light vibration and sound tap (if enabled).
 * Debounced to prevent queue lag on rapid clicks.
 */
export async function triggerLightImpact(): Promise<void> {
  playClickSound('light');
  if (!shouldTrigger('light')) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Triggers a medium vibration and sound tap (if enabled).
 * Debounced to prevent queue lag on rapid clicks.
 */
export async function triggerMediumImpact(): Promise<void> {
  playClickSound('medium');
  if (!shouldTrigger('medium')) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Triggers a heavy vibration and sound tap (if enabled).
 * Debounced to prevent queue lag on rapid clicks.
 */
export async function triggerHeavyImpact(): Promise<void> {
  playClickSound('heavy');
  if (!shouldTrigger('heavy')) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Triggers a notification vibration and chime (if enabled).
 * Debounced to prevent queue lag on rapid clicks.
 */
export async function triggerNotification(type: NotificationType): Promise<void> {
  playClickSound('notification');
  if (!shouldTrigger(`notif_${type}`)) return;
  try {
    await Haptics.notification({ type });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
}

export { NotificationType };
