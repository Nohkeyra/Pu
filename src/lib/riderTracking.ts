export const RIDER_FRESH_MS = 30_000;
export const RIDER_UPDATE_MS = 5_000;
export const RIDER_MAX_ACCURACY_M = 100;
export const RIDER_SESSION_MS = 4 * 60 * 60 * 1000;
export const RESTORAN_COORDS = { lat: 2.92841, lng: 101.68728 };

export interface RiderSession {
  id: string;
  active: boolean;
  startedAt: string;
  updatedAt: string;
  expiresAt: string;
  lastSequence: number;
  endedAt?: string;
  reason?: string;
}

export interface GpsTelemetry {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  heading: number;
  capturedAt: string;
  updatedAt: string;
  source: 'gps';
  active: boolean;
  sessionId: string;
  sequence: number;
}

export function validCoordinates(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90
    && typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;
}

export function canStartRiderTracking(status: unknown): boolean {
  return typeof status === 'string' && ['approved', 'billed', 'in_transit'].includes(status.toLowerCase());
}

export function canViewRiderTracking(status: unknown): boolean {
  return canStartRiderTracking(status) || status === 'delivered' || status === 'completed';
}

export function isFreshRiderLocation(location: unknown, session: RiderSession | null | undefined, now = Date.now()): location is GpsTelemetry {
  if (!location || typeof location !== 'object' || !session?.active || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= now) return false;
  const fix = location as Partial<GpsTelemetry>;
  if (fix.source !== 'gps' || fix.active !== true || fix.sessionId !== session.id || !validCoordinates(fix.lat, fix.lng)) return false;
  if (typeof fix.accuracy !== 'number' || !Number.isFinite(fix.accuracy) || fix.accuracy <= 0 || fix.accuracy > RIDER_MAX_ACCURACY_M) return false;
  const received = Date.parse(fix.updatedAt || '');
  const captured = Date.parse(fix.capturedAt || '');
  return Number.isFinite(received) && Number.isFinite(captured)
    && now - received >= -15_000 && now - received <= RIDER_FRESH_MS
    && now - captured >= -15_000 && now - captured <= RIDER_FRESH_MS;
}

export function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const deltaLat = (b.lat - a.lat) * rad;
  const deltaLng = (b.lng - a.lng) * rad;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(deltaLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function formatRiderDistance(metres: number): string {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.max(0, Math.round(metres))} m`;
}
