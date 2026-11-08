import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFirestore } from '../firebaseAdmin';
import { completeDueOtwOrders, startOtwOrders } from './otwOrders';

vi.mock('../emailService.js', () => ({ createBrevoTransporter: vi.fn(), notifyCustomerOfStatusChange: vi.fn(async () => {}) }));
vi.mock('../calendarService.js', () => ({ syncGoogleCalendarEvent: vi.fn(async () => {}) }));

const db = getFirestore();
const clock = new Date('2026-11-09T00:00:00Z');
const date = '2026-11-09';
afterEach(() => vi.restoreAllMocks());
async function seed(id: string, time: string, extra: Record<string, any> = {}) {
  await db.collection('orders').doc(id).set({ eventDate: date, time, status: 'billed', delivery: 'delivery',
    prices: { breakfast: 10 }, quantity: 10, totalAmount: 100, ...extra });
}

describe('Persisted OTW group lifecycle', () => {
  it('starts only same-day deliveries in the forward hour and the same meal session', async () => {
    for (const [suffix, time] of [['a', '08:00'], ['b', '08:30'], ['c', '09:00'], ['later', '09:01'], ['lunch', '11:00']]) {
      await seed(`otw_window_${suffix}`, time);
    }
    await seed('otw_window_tomorrow', '08:30', { eventDate: '2026-11-10' });
    await seed('otw_window_pickup', '08:30', { delivery: 'pickup' });
    await seed('otw_window_unknown', '08:30', { delivery: null });
    await seed('otw_window_pending', '08:30', { status: 'pending' });
    const batch = await startOtwOrders('otw_window_a', clock);
    expect(batch.orderIds).toEqual(expect.arrayContaining(['otw_window_a', 'otw_window_b', 'otw_window_c']));
    expect(batch.orderIds).toHaveLength(3);
    expect(batch.autoCloseAt).toBe('2026-11-09T01:00:00.000Z');
    for (const suffix of ['later', 'lunch', 'tomorrow', 'pickup', 'unknown', 'pending']) {
      expect((await db.collection('orders').doc(`otw_window_${suffix}`).get()).data()?.status).not.toBe('in_transit');
    }
    expect(await completeDueOtwOrders(new Date('2026-11-09T00:59:59Z'))).toBe(0);
    // No in-process timeout from start is needed: a fresh worker recovers persisted deadlines.
    expect(await completeDueOtwOrders(new Date('2026-11-09T01:00:00Z'))).toBe(3);
    expect(await completeDueOtwOrders(new Date('2026-11-09T01:00:01Z'))).toBe(0);
    const order = (await db.collection('orders').doc('otw_window_a').get()).data();
    expect(order?.status).toBe('completed'); expect(order?.totalAmount).toBe(100);
  });

  it('never resets a deadline on a retried start and serializes competing starts', async () => {
    await seed('otw_retry', '12:00');
    const batches = await Promise.all([startOtwOrders('otw_retry', clock), startOtwOrders('otw_retry', clock)]);
    expect(batches[0].batchId).toBe(batches[1].batchId);
    const retry = await startOtwOrders('otw_retry', new Date('2026-11-09T00:30:00Z'));
    expect(retry.autoCloseAt).toBe(batches[0].autoCloseAt);
  });

  it('preserves later cancellation and closes GPS only on eligible matching orders', async () => {
    await seed('otw_close_a', '15:00', { riderLocation: { active: true }, riderTrackingSession: { active: true } });
    await seed('otw_close_cancelled', '15:30');
    await startOtwOrders('otw_close_a', clock);
    await db.collection('orders').doc('otw_close_cancelled').update({ status: 'cancelled' });
    await completeDueOtwOrders(new Date('2026-11-09T01:00:00Z'));
    const closed = (await db.collection('orders').doc('otw_close_a').get()).data();
    expect(closed?.status).toBe('completed'); expect(closed?.riderLocation.active).toBe(false);
    expect(closed?.riderTrackingSession.active).toBe(false);
    expect((await db.collection('orders').doc('otw_close_cancelled').get()).data()?.status).toBe('cancelled');
  });

  it('can start the group deadline after GPS has already marked departure', async () => {
    await seed('otw_gps_departed', '10:00', { status: 'in_transit' });
    await seed('otw_gps_other_session', '10:01');
    const batch = await startOtwOrders('otw_gps_departed', clock);
    expect(batch.orderIds).toEqual(['otw_gps_departed']);
    expect(batch.autoCloseAt).toBe('2026-11-09T01:00:00.000Z');
  });

  it('rejects other dates, pickup and unknown delivery modes', async () => {
    await seed('otw_invalid_date', '08:00', { eventDate: '2026-11-10' });
    await seed('otw_invalid_pickup', '08:00', { delivery: 'pickup' });
    await seed('otw_invalid_unknown', '08:00', { delivery: null });
    await expect(startOtwOrders('otw_invalid_date', clock)).rejects.toThrow('OTW_TODAY_ONLY');
    await expect(startOtwOrders('otw_invalid_pickup', clock)).rejects.toThrow('OTW_DELIVERY_ONLY');
    await expect(startOtwOrders('otw_invalid_unknown', clock)).rejects.toThrow('OTW_DELIVERY_ONLY');
  });
});
