import { describe, expect, it } from 'vitest';
import {
  MAX_RIDER_TWEEN_METRES,
  RIDER_MARKER_TWEEN_MS,
  riderVisualPointAt,
  shouldTweenRiderMarker,
} from './riderVisualMotion';

describe('rider map visual-only GPS interpolation', () => {
  it('does not animate stale positions, reduced motion, hidden maps or large GPS jumps', () => {
    expect(shouldTweenRiderMarker(12, true, true, false, true)).toBe(true);
    expect(shouldTweenRiderMarker(MAX_RIDER_TWEEN_METRES, true, true, false, true)).toBe(true);
    expect(shouldTweenRiderMarker(MAX_RIDER_TWEEN_METRES + 1, true, true, false, true)).toBe(false);
    expect(shouldTweenRiderMarker(12, false, true, false, true)).toBe(false);
    expect(shouldTweenRiderMarker(12, true, false, false, true)).toBe(false);
    expect(shouldTweenRiderMarker(12, true, true, true, true)).toBe(false);
    expect(shouldTweenRiderMarker(12, true, true, false, false)).toBe(false);
    expect(shouldTweenRiderMarker(Number.NaN, true, true, false, true)).toBe(false);
  });

  it('never overshoots the supplied GPS endpoints', () => {
    const from = { lat: 2.9301, lng: 101.6781 };
    const to = { lat: 2.9305, lng: 101.6788 };
    expect(riderVisualPointAt(from, to, -500)).toEqual(from);
    expect(riderVisualPointAt(from, to, RIDER_MARKER_TWEEN_MS)).toEqual(to);
    expect(riderVisualPointAt(from, to, RIDER_MARKER_TWEEN_MS * 2)).toEqual(to);
    const middle = riderVisualPointAt(from, to, RIDER_MARKER_TWEEN_MS / 2);
    expect(middle.lat).toBeGreaterThan(from.lat);
    expect(middle.lat).toBeLessThan(to.lat);
    expect(middle.lng).toBeGreaterThan(from.lng);
    expect(middle.lng).toBeLessThan(to.lng);
  });

  it('keeps the real last fix as the final displayed point', () => {
    const from = { lat: 3.001, lng: 101.601 };
    const to = { lat: 3.0008, lng: 101.6008 };
    const halfway = riderVisualPointAt(from, to, RIDER_MARKER_TWEEN_MS / 2);
    expect(halfway.lat).toBeLessThan(from.lat);
    expect(halfway.lat).toBeGreaterThan(to.lat);
    expect(riderVisualPointAt(from, to, RIDER_MARKER_TWEEN_MS)).toEqual(to);
  });
});
