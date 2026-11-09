import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../firebaseAdmin.js', () => ({
  getFirestore: () => ({ collection: () => ({ get: h.get }) }),
}));
import { PublicCalendarService } from './publicCalendar';
import { firestoreQuota } from './firestoreQuota';
const snapshot = (rows: Record<string, unknown>[]) => ({
  docs: rows.map((row, i) => ({ id: 'doc_' + i, data: () => row })),
});
const row = { eventDate: '2026-11-10', status: 'approved', meals: ['lunch'], quantity: 25 };
describe('public calendar shared snapshot', () => {
  let service: PublicCalendarService;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(0);
    firestoreQuota.reset();
    h.get.mockReset();
    service = new PublicCalendarService();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('shares a read across concurrent requests and date ranges', async () => {
    h.get.mockResolvedValue(snapshot([row]));
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => service.getData(i % 2 ? '2026-11-01' : '', '2026-11-30'))
    );
    expect(h.get).toHaveBeenCalledTimes(1);
    expect(results[0].orders).toHaveLength(1);
    expect(results[0].sessions['2026-11-10'].lunch).toEqual({ count: 1, pax: 25 });
    await service.getData('2026-12-01', '2026-12-31');
    expect(h.get).toHaveBeenCalledTimes(1);
  });
  it('preserves legacy dates, deleted-record handling and privacy', async () => {
    h.get.mockResolvedValue(
      snapshot([
        { ...row, name: 'Private', email: 'private@example.com', location: 'Private address' },
        { dateTime: '2026-11-11T08:00:00', status: 'pending', meals: ['breakfast'], guests: 10 },
        { createdAt: '2026-11-12', meals: ['tea_break'], quantity: 12 },
        { ...row, deletedByAdmin: true },
        { ...row, status: 'cancelled' },
      ])
    );
    const data = await service.getData();
    expect(data.orders.map((o) => o.id)).toEqual(['doc_0', 'doc_1', 'doc_4']);
    expect(Object.keys(data.orders[0]).sort()).toEqual(
      ['id', 'status', 'eventDate', 'meals', 'guests'].sort()
    );
    expect(JSON.stringify(data)).not.toContain('Private');
    expect(data.sessions['2026-11-10'].lunch.count).toBe(1);
    expect(data.sessions['2026-11-12'].hi_tea.pax).toBe(12);
  });
  it('expires after three minutes and invalidates after a mutation', async () => {
    h.get.mockResolvedValue(snapshot([row]));
    await service.getData();
    vi.setSystemTime(179999);
    await service.getData();
    expect(h.get).toHaveBeenCalledTimes(1);
    vi.setSystemTime(180000);
    await service.getData();
    expect(h.get).toHaveBeenCalledTimes(2);
    service.invalidate();
    await service.getData();
    expect(h.get).toHaveBeenCalledTimes(3);
  });
  it('does not publish stale in-flight data after invalidation', async () => {
    let release!: (s: ReturnType<typeof snapshot>) => void;
    h.get
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            release = r;
          })
      )
      .mockResolvedValue(snapshot([{ ...row, quantity: 50 }]));
    const request = service.getData();
    service.invalidate();
    release(snapshot([row]));
    expect((await request).orders[0].guests).toBe(50);
    expect(h.get).toHaveBeenCalledTimes(2);
  });
  it('reports quota failure rather than a false empty calendar and stops repeated reads', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    h.get.mockRejectedValue(Object.assign(new Error('Quota exceeded'), { code: 8 }));
    await expect(service.getData()).rejects.toThrow('quota');
    await expect(service.getData()).rejects.toThrow('quota');
    expect(h.get).toHaveBeenCalledTimes(1);
    vi.setSystemTime(60000);
    h.get.mockResolvedValue(snapshot([row]));
    expect((await service.getData()).orders).toHaveLength(1);
  });
});
