import { Capacitor, registerPlugin } from '@capacitor/core';
import { getApiUrl } from '@/lib/api';
import { getStoredAdminToken } from './authService';
import { RIDER_UPDATE_MS, RIDER_MAX_ACCURACY_M, type RiderSession } from '@/lib/riderTracking';

export interface RiderDeviceState {
  active: boolean;
  orderId?: string;
  sessionId?: string;
  phase: 'idle' | 'acquiring' | 'sharing' | 'offline' | 'permission_denied' | 'auth_required' | 'ended';
  lastAck?: number;
}
interface NativeRiderPlugin {
  start(options: { orderId: string; sessionId: string }): Promise<RiderDeviceState>;
  stop(): Promise<RiderDeviceState>;
  getState(): Promise<RiderDeviceState>;
}
const NativeRider = registerPlugin<NativeRiderPlugin>('RiderTracking');
export const isNativeRider = () => Capacitor.getPlatform() === 'android';
let device: RiderDeviceState = { active: false, phase: 'idle' };
let watch: number | undefined;
let sequence = 0;
let pending: Promise<void> | null = null;
let lastAttempt = 0;
let activeToken = '';
let generation = 0;

export class RiderTrackingError extends Error {
  constructor(public code: string) { super(code); }
}
export async function riderRequest(path: string, body?: unknown, token?: string) {
  const credential = token || await getStoredAdminToken();
  if (!credential) throw new RiderTrackingError('AUTH_REQUIRED');
  const response = await fetch(getApiUrl(path), {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${credential}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12_000), cache: 'no-store', keepalive: body !== undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new RiderTrackingError(response.status === 401 || response.status === 403 ? 'AUTH_REQUIRED' : result.code || 'TRACKING_UNAVAILABLE');
  return result;
}
export async function startOtwGroup(orderId: string) {
  return riderRequest(`/api/admin/orders/${orderId}/otw`, {});
}
export async function getRiderDeviceState(): Promise<RiderDeviceState> {
  return isNativeRider() && Capacitor.isPluginAvailable('RiderTracking') ? NativeRider.getState() : { ...device };
}
export async function stopRiderSharing(): Promise<RiderDeviceState> {
  generation++;
  if (isNativeRider() && Capacitor.isPluginAvailable('RiderTracking')) return NativeRider.stop();
  const previous = { ...device };
  device = { ...device, active: false, phase: 'idle' };
  if (watch !== undefined) navigator.geolocation.clearWatch(watch);
  watch = undefined;
  // Reserve the stop sequence before awaiting the last upload. Late fixes cannot revive this session.
  const stopSequence = ++sequence;
  await pending?.catch(() => {});
  if (previous.active && previous.orderId && previous.sessionId) {
    await riderRequest(`/api/orders/${previous.orderId}/rider-location`, { sessionId: previous.sessionId, sequence: stopSequence, active: false }, activeToken).catch(() => {});
  }
  return { ...device };
}

export async function startRiderSharing(orderId: string): Promise<RiderDeviceState> {
  if (isNativeRider() && !Capacitor.isPluginAvailable('RiderTracking')) throw new RiderTrackingError('APK_UPDATE_REQUIRED');
  await stopRiderSharing();
  const attempt = ++generation;
  activeToken = await getStoredAdminToken() || '';
  const { session } = await riderRequest(`/api/orders/${orderId}/rider-session`, {}) as { session: RiderSession };
  if (attempt !== generation) {
    await riderRequest(`/api/orders/${orderId}/rider-location`, { sessionId: session.id, sequence: 1, active: false }).catch(() => {});
    throw new RiderTrackingError('START_CANCELLED');
  }
  device = { active: true, orderId, sessionId: session.id, phase: 'acquiring' };
  sequence = 0;
  lastAttempt = 0;
  if (isNativeRider()) {
    try { return await NativeRider.start({ orderId, sessionId: session.id }); }
    catch (error) { await stopRiderSharing(); await riderRequest(`/api/orders/${orderId}/rider-location`, { sessionId: session.id, sequence: 1, active: false }).catch(() => {}); throw error; }
  }
  if (!navigator.geolocation) { await stopRiderSharing(); throw new RiderTrackingError('GPS_UNAVAILABLE'); }
  watch = navigator.geolocation.watchPosition(fix => {
    if (!device.active || device.sessionId !== session.id || pending || Date.now() - lastAttempt < RIDER_UPDATE_MS) return;
    if (fix.coords.accuracy <= 0 || fix.coords.accuracy > RIDER_MAX_ACCURACY_M || Date.now() - fix.timestamp > 30_000) return;
    lastAttempt = Date.now();
    const next = ++sequence;
    pending = riderRequest(`/api/orders/${orderId}/rider-location`, {
      sessionId: session.id, sequence: next, active: true, source: 'gps',
      lat: fix.coords.latitude, lng: fix.coords.longitude, accuracy: fix.coords.accuracy,
      speed: Math.max(0, Math.min(300, (fix.coords.speed || 0) * 3.6)),
      heading: Number.isFinite(fix.coords.heading) && fix.coords.heading! >= 0 ? fix.coords.heading! % 360 : 0,
      capturedAt: new Date(fix.timestamp).toISOString(),
    }).then(() => {
      if (device.active && device.sessionId === session.id) device = { ...device, phase: 'sharing', lastAck: Date.now() };
    }).catch(error => {
      if (!device.active || device.sessionId !== session.id) return;
      const fatal = error instanceof RiderTrackingError && ['AUTH_REQUIRED', 'SESSION_REPLACED', 'TRACKING_ENDED', 'ORDER_NOT_FOUND'].includes(error.code);
      device = { ...device, active: !fatal, phase: fatal ? error.code === 'AUTH_REQUIRED' ? 'auth_required' : 'ended' : 'offline' };
      if (fatal && watch !== undefined) { navigator.geolocation.clearWatch(watch); watch = undefined; }
    }).finally(() => { pending = null; });
  }, error => {
    if (device.sessionId !== session.id || !device.active) return;
    device = { ...device, phase: error.code === 1 ? 'permission_denied' : 'acquiring' };
    if (error.code === 1) void stopRiderSharing().then(() => { if (device.sessionId === session.id && !device.active) device.phase = 'permission_denied'; });
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 });
  return { ...device };
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { if (!isNativeRider()) void stopRiderSharing(); });
  window.addEventListener('rider:logout', () => { void stopRiderSharing(); });
}
