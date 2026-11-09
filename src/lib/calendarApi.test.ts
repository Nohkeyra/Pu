import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCalendarEndpoint } from './calendarApi';

afterEach(() => vi.unstubAllGlobals());

describe('calendar API failures', () => {
  it.each([401, 429, 500, 503])(
    'reports HTTP %s without automatically repeating the read',
    async (status) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status }));
      vi.stubGlobal('fetch', fetchMock);
      await expect(
        fetchCalendarEndpoint('/api/calendar-orders', new AbortController().signal)
      ).rejects.toThrow(`HTTP ${status}`);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it('preserves the network failure and lets the caller offer Retry', async () => {
    const failure = new TypeError('Failed to fetch');
    const fetchMock = vi.fn().mockRejectedValue(failure);
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      fetchCalendarEndpoint('/api/calendar-orders', new AbortController().signal)
    ).rejects.toBe(failure);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('passes cancellation through and returns the response data', async () => {
    const controller = new AbortController();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ success: true, orders: [] })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCalendarEndpoint('/api/calendar-orders', controller.signal)).resolves.toEqual(
      { success: true, orders: [] }
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/calendar-orders', { signal: controller.signal });
  });

  it('does not retry an aborted request', async () => {
    const error = new DOMException('Aborted', 'AbortError');
    const fetchMock = vi.fn().mockRejectedValue(error);
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      fetchCalendarEndpoint('/api/calendar-orders', new AbortController().signal)
    ).rejects.toBe(error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
