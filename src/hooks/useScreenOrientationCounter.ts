import { useEffect, useState } from 'react';
import { useSpring } from 'motion/react';

/**
 * FEATURE (2026-08-13): "logo sentiasa pandang saya" — Noh wants the hero
 * logo on the Login screen to stay visually upright even when the physical
 * device is rotated (portrait <-> landscape), instead of rotating along
 * with the WebView/screen like the rest of the UI does.
 *
 * This is orthogonal to useDeviceMotion3D (which reads the accelerometer
 * for a subtle X/Y tilt-toward-you effect). This hook reads screen
 * ORIENTATION (portrait vs landscape, not tilt angle) and returns a Z-axis
 * counter-rotation so a caller can apply `rotate: counterRotate` and cancel
 * out the screen's own rotation.
 *
 * Reliability note: `screen.orientation.angle` is documented as
 * inconsistent across devices/browsers (some report the angle inverted).
 * `screen.orientation.type` (portrait-primary / landscape-primary /
 * landscape-secondary / portrait-secondary) is the more reliable signal and
 * is what this hook keys off. `angle` is only used as a same-device
 * fallback when `type` isn't available, and `orientationchange` /
 * `resize` events both trigger a re-check since not all Android WebView
 * versions fire both consistently.
 */

type OrientationType =
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary';

function getCounterRotationAngle(): number {
  try {
    const orientation = (window.screen as any)?.orientation as
      | { type?: OrientationType; angle?: number }
      | undefined;

    if (orientation?.type) {
      switch (orientation.type) {
        case 'landscape-primary':
          return -90;
        case 'landscape-secondary':
          return 90;
        case 'portrait-secondary':
          return 180;
        case 'portrait-primary':
        default:
          return 0;
      }
    }

    // Fallback: some Android WebView builds don't expose `type`, only `angle`.
    if (typeof orientation?.angle === 'number') {
      // Counter-rotate by the negative of the reported angle.
      return -orientation.angle;
    }
  } catch {
    // Ignored — fall through to the safe default below.
  }

  // Last-resort fallback: matchMedia orientation (portrait vs landscape only,
  // can't distinguish primary/secondary, but better than nothing).
  try {
    if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) {
      return -90;
    }
  } catch {
    // Ignored
  }

  return 0;
}

export function useScreenOrientationCounter() {
  const [rawAngle, setRawAngle] = useState<number>(() =>
    typeof window !== 'undefined' ? getCounterRotationAngle() : 0
  );

  // Smooth the jump between angles so it's a quick spin rather than a snap,
  // matching the spring feel already used for the accelerometer tilt.
  const counterRotate = useSpring(rawAngle, { damping: 20, stiffness: 110, mass: 0.5 });

  useEffect(() => {
    const handleChange = () => setRawAngle(getCounterRotationAngle());

    handleChange();

    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);

    const orientation = (window.screen as any)?.orientation as
      | { addEventListener?: (type: string, cb: () => void) => void; removeEventListener?: (type: string, cb: () => void) => void }
      | undefined;
    orientation?.addEventListener?.('change', handleChange);

    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
      orientation?.removeEventListener?.('change', handleChange);
    };
  }, []);

  useEffect(() => {
    counterRotate.set(rawAngle);
  }, [rawAngle, counterRotate]);

  return counterRotate;
}
