import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web', isPluginAvailable: () => false }, registerPlugin: () => ({}) }));
vi.mock('./authService', () => ({ getStoredAdminToken: vi.fn(async () => 'test-admin-token') }));
vi.mock('@/lib/api', () => ({ getApiUrl: (path: string) => path }));

describe('Foreground rider GPS lifecycle', () => {
  let success: PositionCallback;
  let failure: PositionErrorCallback;
  const clearWatch = vi.fn();
  let writes: Record<string, unknown>[];
  beforeEach(() => {
    vi.resetModules(); writes = []; clearWatch.mockClear();
    vi.stubGlobal('navigator', { geolocation: {
      watchPosition: vi.fn((ok: PositionCallback, error: PositionErrorCallback) => { success = ok; failure = error; return 81; }), clearWatch,
    } });
    vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
      expect((options.headers as Record<string, string>).Authorization).toBe('Bearer test-admin-token');
      if (url.endsWith('rider-session')) return Response.json({ session: { id: 'test-session-123456' } });
      writes.push(JSON.parse(String(options.body))); return Response.json({ success: true });
    }));
  });
  afterEach(async () => { const service = await import('./riderTrackingService'); await service.stopRiderSharing(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  const fix = (accuracy = 12, timestamp = Date.now()) => ({ coords: { latitude: 2.92841, longitude: 101.68728, accuracy, speed: null, heading: null }, timestamp }) as GeolocationPosition;
  it('does not claim sharing until an authenticated GPS upload is acknowledged', async () => {
    const service = await import('./riderTrackingService');
    expect((await service.startRiderSharing('example_order')).phase).toBe('acquiring');
    expect(writes).toHaveLength(0);
    success(fix()); await vi.waitFor(async () => expect((await service.getRiderDeviceState()).phase).toBe('sharing'));
    expect(writes[0]).toMatchObject({ source: 'gps', active: true, sequence: 1, speed: 0, heading: 0 });
  });
  it('ignores cached or inaccurate fixes and stops GPS before publishing the stop', async () => {
    const service = await import('./riderTrackingService'); await service.startRiderSharing('example_order');
    success(fix(101)); success(fix(10, Date.now() - 31_000)); expect(writes).toHaveLength(0);
    await service.stopRiderSharing(); expect(clearWatch).toHaveBeenCalledWith(81);
    expect(writes).toEqual([{ sessionId: 'test-session-123456', sequence: 1, active: false }]);
    success(fix()); expect(writes).toHaveLength(1);
  });
  it('reports rejected authentication and clears the location watcher', async () => {
    const service = await import('./riderTrackingService'); await service.startRiderSharing('example_order');
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 }));
    success(fix()); await vi.waitFor(async () => expect((await service.getRiderDeviceState()).phase).toBe('auth_required'));
    expect((await service.getRiderDeviceState()).active).toBe(false); expect(clearWatch).toHaveBeenCalledWith(81);
  });
  it('keeps a lost network offline instead of reporting live', async () => {
    const service = await import('./riderTrackingService'); await service.startRiderSharing('example_order');
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Simulated offline'));
    success(fix()); await vi.waitFor(async () => expect((await service.getRiderDeviceState()).phase).toBe('offline'));
    expect((await service.getRiderDeviceState()).lastAck).toBeUndefined();
  });
  it('denied location permission ends the session', async () => {
    const service = await import('./riderTrackingService'); await service.startRiderSharing('example_order');
    failure({ code: 1 } as GeolocationPositionError);
    await vi.waitFor(async () => expect((await service.getRiderDeviceState()).phase).toBe('permission_denied'));
    expect((await service.getRiderDeviceState()).active).toBe(false); expect(clearWatch).toHaveBeenCalledWith(81);
  });
  it('closing during session startup cannot leave a hidden GPS watcher', async () => {
    const service = await import('./riderTrackingService');
    let resolveStart: (value: Response) => void = () => {};
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { resolveStart = resolve; }));
    const starting = service.startRiderSharing('example_order');
    const rejected = expect(starting).rejects.toMatchObject({ code: 'START_CANCELLED' });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await service.stopRiderSharing();
    resolveStart(Response.json({ session: { id: 'test-session-123456' } }));
    await rejected;
    expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
    expect(writes.at(-1)).toMatchObject({ active: false });
  });
});
