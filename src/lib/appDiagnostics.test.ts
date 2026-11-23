import { afterEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ invalidateFetchCache: vi.fn() }));
vi.mock('./api', () => ({ ...api, getApiUrl: (path: string) => 'https://local-api.invalid' + path }));
import { clearTemporaryAppCaches, measureApiLatency } from './appDiagnostics';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.clearAllMocks(); });

describe('safe diagnostics', () => {
  it('clears only Wawasan response caches, preserving all durable local data', async () => {
    const durable = { getItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('localStorage', durable);
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('caches', { keys: async () => ['wawasan-runtime-v1', 'another-app-cache'], delete: deleteCache });
    expect(await clearTemporaryAppCaches()).toBe(1);
    expect(api.invalidateFetchCache).toHaveBeenCalledOnce();
    expect(deleteCache.mock.calls).toEqual([['wawasan-runtime-v1']]);
    expect(durable.removeItem).not.toHaveBeenCalled();
    expect(durable.clear).not.toHaveBeenCalled();
  });

  it('retains offline assets while the device is offline', async () => {
    const deleteCache = vi.fn();
    vi.stubGlobal('navigator', { onLine: false });
    vi.stubGlobal('caches', { keys: async () => ['wawasan-offline-v1'], delete: deleteCache });
    expect(await clearTemporaryAppCaches()).toBe(0);
    expect(deleteCache).not.toHaveBeenCalled();
  });

  it('measures the API endpoint rather than a bundled local favicon', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetcher);
    expect(await measureApiLatency(new AbortController().signal)).toBeGreaterThanOrEqual(0);
    expect(fetcher).toHaveBeenCalledWith('https://local-api.invalid/api/health', expect.objectContaining({ cache: 'no-store' }));
  });

  it('does not turn a rejected HTTP response into a latency reading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(measureApiLatency(new AbortController().signal)).rejects.toThrow('HTTP 503');
  });

  it('aborts a stalled health request after eight seconds', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
    })));
    const result = expect(measureApiLatency(new AbortController().signal)).rejects.toThrow('Aborted');
    await vi.advanceTimersByTimeAsync(8000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels in-flight work when its diagnostic screen closes', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
    })));
    const controller = new AbortController();
    const result = expect(measureApiLatency(controller.signal)).rejects.toThrow('Aborted');
    controller.abort();
    await result;
  });
});
