import { describe, expect, it } from 'vitest';
import { canStartRiderTracking, canViewRiderTracking, isFreshRiderLocation, type GpsTelemetry, type RiderSession } from './riderTracking';

describe('Truthful GPS presentation', () => {
  const now = Date.now();
  const session: RiderSession = { id: 'session-example', active: true, startedAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60_000).toISOString(), lastSequence: 1 };
  const fix: GpsTelemetry = { lat: 2.9, lng: 101.6, accuracy: 10, speed: 0, heading: 0, source: 'gps', active: true, capturedAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), sessionId: session.id, sequence: 1 };
  it('a fresh stationary GPS position is valid', () => expect(isFreshRiderLocation(fix, session, now)).toBe(true));
  it('old coordinates, even newly received, are not live', () => expect(isFreshRiderLocation({ ...fix, capturedAt: new Date(now - 31_000).toISOString() }, session, now)).toBe(false));
  it('stale server updates expire while the screen remains open', () => expect(isFreshRiderLocation(fix, session, now + 31_000)).toBe(false));
  it('legacy, inaccurate or inactive telemetry is never labelled live', () => {
    for (const patch of [{ source: undefined }, { accuracy: 101 }, { active: false }, { lat: Infinity }, { sessionId: 'old' }]) expect(isFreshRiderLocation({ ...fix, ...patch }, session, now)).toBe(false);
  });
  it('expired and replaced sessions are not live', () => {
    expect(isFreshRiderLocation(fix, { ...session, active: false }, now)).toBe(false);
    expect(isFreshRiderLocation(fix, { ...session, expiresAt: new Date(now - 1).toISOString() }, now)).toBe(false);
  });
  it('tracking can be reopened while in transit but not started after completion', () => {
    expect(canStartRiderTracking('in_transit')).toBe(true); expect(canStartRiderTracking('delivered')).toBe(false); expect(canViewRiderTracking('delivered')).toBe(true);
  });
});
