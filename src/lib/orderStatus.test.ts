import { describe, expect, it } from 'vitest';
import { getOrderStatus } from './orderStatus';

describe('order status presentation', () => {
  it.each([
    ['pending', 'Dalam semakan', 'Pending review'], ['approved', 'Diluluskan', 'Approved'],
    ['billed', 'Telah diinvois', 'Billed'], ['in_transit', 'Dalam perjalanan', 'In transit'],
    ['delivered', 'Dihantar', 'Delivered'], ['completed', 'Selesai', 'Completed'],
    ['cancel_requested', 'Pembatalan dimohon', 'Cancellation requested'],
    ['cancelled', 'Dibatalkan', 'Cancelled'], ['rejected', 'Ditolak', 'Rejected'],
  ])('labels %s consistently in both languages', (status, bm, en) => {
    expect(getOrderStatus(status, 'bm').label).toBe(bm);
    expect(getOrderStatus(status, 'en').label).toBe(en);
    expect(getOrderStatus(status, 'bm').key).toBe(status);
  });

  it('does not describe a cancellation, completed order or unknown status as pending', () => {
    for (const value of ['cancel_requested', 'completed', 'new-server-state', '__proto__', 'constructor']) {
      expect(getOrderStatus(value, 'en').label).not.toBe('Pending review');
    }
    expect(getOrderStatus('new-server-state', 'bm').key).toBe('unknown');
  });

  it('retains legacy missing-status and translated-status compatibility', () => {
    expect(getOrderStatus(undefined, 'en').key).toBe('pending');
    expect(getOrderStatus(' DILULUSKAN ', 'en').key).toBe('approved');
    expect(getOrderStatus('dibilkan', 'bm').key).toBe('billed');
    expect(getOrderStatus('dibatalkan', 'bm').key).toBe('cancelled');
  });
});
