import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Debounce map to prevent rapid-fire haptic spam
const lastHapticTime: Record<string, number> = {};
const DEBOUNCE_MS = 120;
const MAX_DEBOUNCE_KEYS = 20;

// Web Audio API Sound Synthesizer for Touch & Click Sound Effects
let audioCtx: AudioContext | null = null;
let isUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
  } catch (e) {
    console.debug('Failed to initialize AudioContext:', e);
  }
  return audioCtx;
}

// Automatically unlock AudioContext on the first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (isUnlocked) return;
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isUnlocked = true;
        }).catch(() => {});
      } else {
        isUnlocked = true;
      }
    }
  };

  window.addEventListener('pointerdown', unlockAudio, { once: false, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: false, passive: true });
  window.addEventListener('click', unlockAudio, { once: false, passive: true });
}

export type SoundProfile = 'thock' | 'taptic' | 'sub_bass' | 'aluminum' | 'wood' | 'crisp';

/**
 * Returns current sound profile. Defaults to 'thock' for the most satisfying, premium tactile ASMR thock.
 */
export function getSoundProfile(): SoundProfile {
  try {
    const val = typeof localStorage !== 'undefined' ? localStorage.getItem('wawasan_sound_profile') : null;
    if (
      val === 'thock' ||
      val === 'taptic' ||
      val === 'sub_bass' ||
      val === 'aluminum' ||
      val === 'wood' ||
      val === 'crisp'
    ) {
      return val;
    }
  } catch {
    // ignore
  }
  return 'thock';
}

export function setSoundProfile(profile: SoundProfile): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wawasan_sound_profile', profile);
    }
  } catch {
    // ignore
  }
}

/**
 * Synthesizes high-end, bold UI click/tap sounds using Web Audio API.
 * Supports Mechanical Thock, Taptic Glass Impulse, Sub-Bass Tock, Anodized Aluminum Rotary, Teakwood, and Modern Crisp.
 */
export function playClickSound(
  soundType: 'light' | 'medium' | 'heavy' | 'notification' | 'force' = 'light',
  profileOverride?: SoundProfile
) {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('wawasan_sound_effects_enabled') : null;
    const isSoundEnabled = stored === null ? true : stored === 'true';
    if (!isSoundEnabled && soundType !== 'force') return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const profile = profileOverride || getSoundProfile();

    const playSound = () => {
      const now = ctx.currentTime;

      if (profile === 'thock') {
        // =================================================================
        // LUBED MECHANICAL "THOCK" (CREAMY ASMR SWITCH BOTTOM-OUT)
        // Universally rated highest for tactile satisfaction in UI design.
        // 1. Soft switch stem transient (triangle 720Hz -> 250Hz in 6ms)
        // 2. Resonant lubricated housing body (warm sine 220Hz -> 92Hz in 34ms)
        // 3. Acoustic Lowpass damping (950Hz) to eliminate high-pitch plastic noise
        // =================================================================
        const stemOsc = ctx.createOscillator();
        const bodyOsc = ctx.createOscillator();
        const stemGain = ctx.createGain();
        const bodyGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, now);
        filter.Q.setValueAtTime(1.1, now);

        stemOsc.connect(stemGain);
        bodyOsc.connect(bodyGain);
        stemGain.connect(filter);
        bodyGain.connect(filter);
        filter.connect(ctx.destination);

        if (soundType === 'light' || soundType === 'force') {
          // Switch stem tap (crisp organic transient)
          stemOsc.type = 'triangle';
          stemOsc.frequency.setValueAtTime(720, now);
          stemOsc.frequency.exponentialRampToValueAtTime(240, now + 0.007);
          stemGain.gain.setValueAtTime(0.001, now);
          stemGain.gain.linearRampToValueAtTime(0.55, now + 0.001);
          stemGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

          // Deep creamy thock body
          bodyOsc.type = 'sine';
          bodyOsc.frequency.setValueAtTime(220, now);
          bodyOsc.frequency.exponentialRampToValueAtTime(90, now + 0.034);
          bodyGain.gain.setValueAtTime(0.001, now);
          bodyGain.gain.linearRampToValueAtTime(0.75, now + 0.002);
          bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

          stemOsc.start(now);
          bodyOsc.start(now);
          stemOsc.stop(now + 0.01);
          bodyOsc.stop(now + 0.04);
        } else if (soundType === 'medium') {
          // Weighted keycap tap
          stemOsc.type = 'triangle';
          stemOsc.frequency.setValueAtTime(580, now);
          stemOsc.frequency.exponentialRampToValueAtTime(190, now + 0.009);
          stemGain.gain.setValueAtTime(0.001, now);
          stemGain.gain.linearRampToValueAtTime(0.6, now + 0.001);
          stemGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);

          bodyOsc.type = 'sine';
          bodyOsc.frequency.setValueAtTime(185, now);
          bodyOsc.frequency.exponentialRampToValueAtTime(78, now + 0.045);
          bodyGain.gain.setValueAtTime(0.001, now);
          bodyGain.gain.linearRampToValueAtTime(0.8, now + 0.002);
          bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

          stemOsc.start(now);
          bodyOsc.start(now);
          stemOsc.stop(now + 0.012);
          bodyOsc.stop(now + 0.05);
        } else if (soundType === 'heavy') {
          // Deep spacebar bottom-out
          stemOsc.type = 'triangle';
          stemOsc.frequency.setValueAtTime(460, now);
          stemOsc.frequency.exponentialRampToValueAtTime(150, now + 0.012);
          stemGain.gain.setValueAtTime(0.001, now);
          stemGain.gain.linearRampToValueAtTime(0.65, now + 0.002);
          stemGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

          bodyOsc.type = 'sine';
          bodyOsc.frequency.setValueAtTime(150, now);
          bodyOsc.frequency.exponentialRampToValueAtTime(60, now + 0.065);
          bodyGain.gain.setValueAtTime(0.001, now);
          bodyGain.gain.linearRampToValueAtTime(0.85, now + 0.003);
          bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

          stemOsc.start(now);
          bodyOsc.start(now);
          stemOsc.stop(now + 0.018);
          bodyOsc.stop(now + 0.075);
        } else if (soundType === 'notification') {
          bodyOsc.type = 'sine';
          bodyOsc.frequency.setValueAtTime(261.63, now); // C4
          bodyOsc.frequency.setValueAtTime(392.0, now + 0.08); // G4
          bodyGain.gain.setValueAtTime(0.001, now);
          bodyGain.gain.linearRampToValueAtTime(0.5, now + 0.004);
          bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
          bodyOsc.start(now);
          bodyOsc.stop(now + 0.26);
        }
      } else if (profile === 'taptic') {
        // =================================================================
        // TAPTIC GLASS IMPULSE (APPLE FORCE TOUCH TRACKPAD / IPHONE TAP)
        // Hyper-precise micro-impulse. Gives the physical sensation of glass deflection:
        // - Razor-sharp 3ms transient (1300Hz -> 420Hz)
        // - Damped haptic resonance (165Hz -> 75Hz in 18ms)
        // - Zero overhang, zero ringing, feels crisp, invisible & instantaneous
        // =================================================================
        const clickOsc = ctx.createOscillator();
        const pulseOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        const pulseGain = ctx.createGain();

        clickOsc.connect(clickGain);
        pulseOsc.connect(pulseGain);
        clickGain.connect(ctx.destination);
        pulseGain.connect(ctx.destination);

        if (soundType === 'light' || soundType === 'force') {
          clickOsc.type = 'sine';
          clickOsc.frequency.setValueAtTime(1300, now);
          clickOsc.frequency.exponentialRampToValueAtTime(420, now + 0.0035);
          clickGain.gain.setValueAtTime(0.001, now);
          clickGain.gain.linearRampToValueAtTime(0.48, now + 0.0008);
          clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.004);

          pulseOsc.type = 'sine';
          pulseOsc.frequency.setValueAtTime(165, now);
          pulseOsc.frequency.exponentialRampToValueAtTime(75, now + 0.018);
          pulseGain.gain.setValueAtTime(0.001, now);
          pulseGain.gain.linearRampToValueAtTime(0.68, now + 0.0015);
          pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

          clickOsc.start(now);
          pulseOsc.start(now);
          clickOsc.stop(now + 0.005);
          pulseOsc.stop(now + 0.022);
        } else if (soundType === 'medium') {
          clickOsc.type = 'sine';
          clickOsc.frequency.setValueAtTime(1100, now);
          clickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.004);
          clickGain.gain.setValueAtTime(0.001, now);
          clickGain.gain.linearRampToValueAtTime(0.52, now + 0.001);
          clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.005);

          pulseOsc.type = 'sine';
          pulseOsc.frequency.setValueAtTime(145, now);
          pulseOsc.frequency.exponentialRampToValueAtTime(65, now + 0.024);
          pulseGain.gain.setValueAtTime(0.001, now);
          pulseGain.gain.linearRampToValueAtTime(0.72, now + 0.002);
          pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);

          clickOsc.start(now);
          pulseOsc.start(now);
          clickOsc.stop(now + 0.006);
          pulseOsc.stop(now + 0.028);
        } else if (soundType === 'heavy') {
          clickOsc.type = 'sine';
          clickOsc.frequency.setValueAtTime(900, now);
          clickOsc.frequency.exponentialRampToValueAtTime(260, now + 0.005);
          clickGain.gain.setValueAtTime(0.001, now);
          clickGain.gain.linearRampToValueAtTime(0.58, now + 0.001);
          clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);

          pulseOsc.type = 'sine';
          pulseOsc.frequency.setValueAtTime(125, now);
          pulseOsc.frequency.exponentialRampToValueAtTime(55, now + 0.032);
          pulseGain.gain.setValueAtTime(0.001, now);
          pulseGain.gain.linearRampToValueAtTime(0.78, now + 0.002);
          pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

          clickOsc.start(now);
          pulseOsc.start(now);
          clickOsc.stop(now + 0.007);
          pulseOsc.stop(now + 0.038);
        } else if (soundType === 'notification') {
          pulseOsc.type = 'sine';
          pulseOsc.frequency.setValueAtTime(587.33, now); // D5
          pulseOsc.frequency.setValueAtTime(880.0, now + 0.06); // A5
          pulseGain.gain.setValueAtTime(0.001, now);
          pulseGain.gain.linearRampToValueAtTime(0.4, now + 0.002);
          pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          pulseOsc.start(now);
          pulseOsc.stop(now + 0.18);
        }
      } else if (profile === 'sub_bass') {
        // =================================================================
        // SUB-BASS HAPTIC TOCK (MINIMALIST LUXURY / OG HIGH-END)
        // Damped low-frequency sine/triangle burst with acoustic lowpass filter.
        // Enhanced harmonics so phone speakers can punch clearly.
        // =================================================================
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(620, now);
        filter.Q.setValueAtTime(1.2, now);

        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(filter);
        filter.connect(ctx.destination);

        if (soundType === 'light' || soundType === 'force') {
          // Punchy sub-tock: 230Hz sweeps fast to 62Hz in 38ms
          osc.type = 'sine';
          osc.frequency.setValueAtTime(230, now);
          osc.frequency.exponentialRampToValueAtTime(62, now + 0.038);

          // 2nd harmonic for phone speaker punch (460Hz -> 124Hz in 24ms)
          subOsc.type = 'triangle';
          subOsc.frequency.setValueAtTime(460, now);
          subOsc.frequency.exponentialRampToValueAtTime(124, now + 0.024);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.7, now + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          osc.start(now);
          subOsc.start(now);
          osc.stop(now + 0.042);
          subOsc.stop(now + 0.042);
        } else if (soundType === 'medium') {
          // Deeper weighted thud: 185Hz -> 52Hz in 52ms
          osc.type = 'sine';
          osc.frequency.setValueAtTime(185, now);
          osc.frequency.exponentialRampToValueAtTime(52, now + 0.052);

          subOsc.type = 'triangle';
          subOsc.frequency.setValueAtTime(370, now);
          subOsc.frequency.exponentialRampToValueAtTime(104, now + 0.032);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.75, now + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

          osc.start(now);
          subOsc.start(now);
          osc.stop(now + 0.058);
          subOsc.stop(now + 0.058);
        } else if (soundType === 'heavy') {
          // Authoritative heavy sub impact: 150Hz -> 44Hz in 75ms
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(44, now + 0.075);

          subOsc.type = 'triangle';
          subOsc.frequency.setValueAtTime(300, now);
          subOsc.frequency.exponentialRampToValueAtTime(88, now + 0.042);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.82, now + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          osc.start(now);
          subOsc.start(now);
          osc.stop(now + 0.082);
          subOsc.stop(now + 0.082);
        } else if (soundType === 'notification') {
          // Deep warm double tone chime (A3 to E4)
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.setValueAtTime(329.63, now + 0.07);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.5, now + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

          osc.start(now);
          osc.stop(now + 0.24);
        }
      } else if (profile === 'aluminum') {
        // =================================================================
        // HI-FI ANODIZED ALUMINUM ROTARY
        // High micro-metallic click (1400Hz) coupled with damped low punch.
        // =================================================================
        const clickOsc = ctx.createOscillator();
        const bodyOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        const bodyGain = ctx.createGain();

        clickOsc.connect(clickGain);
        bodyOsc.connect(bodyGain);
        clickGain.connect(ctx.destination);
        bodyGain.connect(ctx.destination);

        // Metallic micro-click (sharp transient 5ms)
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(1400, now);
        clickOsc.frequency.exponentialRampToValueAtTime(700, now + 0.006);
        clickGain.gain.setValueAtTime(0.35, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);

        // Weighted body tone (180Hz -> 65Hz in 36ms)
        bodyOsc.type = 'sine';
        bodyOsc.frequency.setValueAtTime(180, now);
        bodyOsc.frequency.exponentialRampToValueAtTime(65, now + 0.036);
        bodyGain.gain.setValueAtTime(0.45, now);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

        clickOsc.start(now);
        bodyOsc.start(now);
        clickOsc.stop(now + 0.007);
        bodyOsc.stop(now + 0.04);
      } else if (profile === 'wood') {
        // =================================================================
        // RESONANT TEAKWOOD (WARM ORGANIC TAP)
        // Triangle wave filtered through warm bandpass filter.
        // =================================================================
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(320, now);
        filter.Q.setValueAtTime(2.0, now);

        osc.connect(gain);
        gain.connect(filter);
        filter.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.65, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.052);

        osc.start(now);
        osc.stop(now + 0.055);
      } else {
        // =================================================================
        // MODERN CRISP (ORIGINAL HIGH POP)
        // =================================================================
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (soundType === 'light' || soundType === 'force') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(950, now);
          osc.frequency.exponentialRampToValueAtTime(360, now + 0.04);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (soundType === 'medium') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(720, now);
          osc.frequency.exponentialRampToValueAtTime(240, now + 0.055);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
          osc.start(now);
          osc.stop(now + 0.055);
        } else if (soundType === 'heavy') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.075);
          gain.gain.setValueAtTime(0.45, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
          osc.start(now);
          osc.stop(now + 0.075);
        } else if (soundType === 'notification') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.06);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.18);
        }
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(playSound).catch(() => {});
    } else {
      playSound();
    }
  } catch (err) {
    console.debug('Audio click sound error:', err);
  }
}

/**
 * Triggers a dramatic cinematic impact with haptic heavy punch (no audio)
 */
export async function triggerDramaticImpact(): Promise<void> {
  if (!shouldTrigger('dramatic_impact')) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
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
