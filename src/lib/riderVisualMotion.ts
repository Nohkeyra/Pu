/**
 * Presentation-only interpolation between two validated GPS fixes.
 * Never generates a location beyond the supplied endpoints, changes a stored
 * fix, advances the map camera or implies that stale telemetry is live.
 */
export const RIDER_MARKER_TWEEN_MS = 440;
export const MAX_RIDER_TWEEN_METRES = 75;

export type RiderVisualPoint = { lat: number; lng: number };

export function shouldTweenRiderMarker(
  distanceMetres: number,
  isLive: boolean,
  wasLive: boolean,
  reducedMotion: boolean,
  isVisible: boolean,
): boolean {
  return isLive && wasLive && !reducedMotion && isVisible &&
    Number.isFinite(distanceMetres) && distanceMetres > 0.5 &&
    distanceMetres <= MAX_RIDER_TWEEN_METRES;
}

export function riderVisualPointAt(
  from: RiderVisualPoint,
  to: RiderVisualPoint,
  elapsedMs: number,
): RiderVisualPoint {
  if (elapsedMs <= 0) return from;
  if (elapsedMs >= RIDER_MARKER_TWEEN_MS) return to;
  const t = Math.max(0, Math.min(1, elapsedMs / RIDER_MARKER_TWEEN_MS));
  const eased = 1 - Math.pow(1 - t, 3);
  return {
    lat: from.lat + (to.lat - from.lat) * eased,
    lng: from.lng + (to.lng - from.lng) * eased,
  };
}
