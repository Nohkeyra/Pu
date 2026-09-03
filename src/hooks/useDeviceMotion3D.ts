import { useContext, useRef } from 'react';
import { useTransform } from 'motion/react';
import { BatikMotionContext, type BatikRawMotion } from '@/context/batikMotionContext';

function useBatikRawMotion(): BatikRawMotion {
  const ctx = useContext(BatikMotionContext);
  if (!ctx) {
    throw new Error('useDeviceMotion3D must be used within a <BatikMotionProvider> (mounted once in App.tsx).');
  }
  return ctx;
}

/**
 * Per-instance hook used by <Batik3DMotion>. Reads the single shared,
 * normalized tilt source (see components/BatikMotionProvider.tsx) and
 * scales it to this instance's maxRotation.
 * isVisibleRef lets the caller (Batik3DMotion, via IntersectionObserver)
 * freeze this instance's output at 0 while it's off-screen or hidden
 * behind another element, so React Motion doesn't keep recomputing/
 * repainting a transform nobody can see.
 */
export function useDeviceMotion3D(maxRotation = 15, isVisibleRef?: { current: boolean }) {
  const { rawX, rawY } = useBatikRawMotion();

  const rotateX = useTransform(rawX, (v) => (isVisibleRef && !isVisibleRef.current ? 0 : v * maxRotation));
  const rotateY = useTransform(rawY, (v) => (isVisibleRef && !isVisibleRef.current ? 0 : v * maxRotation));

  return { rotateX, rotateY };
}

/** Ref-holder for the IntersectionObserver visibility gate (see Batik3DMotion.tsx). */
export function useBatikVisibilityRef() {
  return useRef(true);
}
