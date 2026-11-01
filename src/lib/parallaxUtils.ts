/**
 * Calculates deterministic parallax offsets for batik-container layers.
 */
export function calculateBatikParallaxOffsets(
  progress: number,
  options: {
    speed?: number;
    offsetRange?: [number, number];
    direction?: 'vertical' | 'subtle-drift';
    reduceMotion?: boolean;
  } = {}
): { x: number; y: number } {
  const { speed = 0.16, offsetRange, direction = 'vertical', reduceMotion = false } = options;
  if (reduceMotion) {
    return { x: 0, y: 0 };
  }
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const maxOffset = offsetRange ? offsetRange[1] : Math.max(12, Math.round(140 * speed));
  const minOffset = offsetRange ? offsetRange[0] : -maxOffset;
  const y = minOffset + (maxOffset - minOffset) * clampedProgress;
  const x =
    direction === 'subtle-drift'
      ? -Math.round(maxOffset * 0.25) + Math.round(maxOffset * 0.5) * clampedProgress
      : 0;
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}
