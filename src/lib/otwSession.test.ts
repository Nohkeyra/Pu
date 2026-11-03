import { describe, expect, it } from 'vitest';
import { malaysiaDate, otwAutoCloseAt, otwEventDate, otwEventMinute, otwSessionForMinute, selectOtwOrders } from './otwSession';

const order = (id: string, date: string, time: string, status = 'approved') => ({ id, eventDate: date, time, status, delivery: true });

describe('OTW session eligibility', () => {
  it('uses Malaysia calendar day across UTC midnight', () => {
    expect(malaysiaDate(new Date('2026-11-03T17:00:00Z'))).toBe('2026-11-04');
    expect(otwEventDate({ dateTime: '2026-11-03T17:00:00Z' })).toBe('2026-11-04');
  });
  it('honors 10:00 and 14:00 boundaries', () => {
    expect(otwSessionForMinute(600)).toBe('breakfast');
    expect(otwSessionForMinute(601)).toBe('lunch');
    expect(otwSessionForMinute(840)).toBe('lunch');
    expect(otwSessionForMinute(841)).toBe('hi_tea');
  });
  it('handles common time formats and rejects malformed values', () => {
    expect(otwEventMinute('8:30 AM')).toBe(510);
    expect(otwEventMinute('14:01')).toBe(841);
    expect(otwEventMinute('25:00')).toBeNull();
    expect(otwEventMinute('8 AM')).toBeNull();
  });
  it('groups all breakfast deliveries on the same date, not tomorrow or lunch', () => {
    const orders = [
      order('a', '2026-11-03', '08:00'), order('b', '2026-11-03', '08:30'),
      order('c', '2026-11-03', '09:00'), order('d', '2026-11-03', '11:00'),
      order('e', '2026-11-04', '08:00'), order('f', '2026-11-03', '09:00', 'completed'),
      { ...order('g', '2026-11-03', '09:00'), delivery: false },
    ];
    expect(selectOtwOrders(orders, '2026-11-03', 'breakfast', o => o.delivery).map(o => o.id)).toEqual(['a', 'b', 'c']);
  });
  it('fails closed on invalid date/time and excludes cancelled orders', () => {
    const orders = [order('a', '2026-02-30', '08:00'), order('b', '2026-11-03', '25:00'), order('c', '2026-11-03', '08:00', 'cancelled')];
    expect(selectOtwOrders(orders, '2026-11-03', 'breakfast', () => true)).toEqual([]);
  });
  it('schedules a 60-minute close without modifying payment', () => {
    expect(otwAutoCloseAt(new Date('2026-11-03T00:30:00Z'))).toBe('2026-11-03T01:30:00.000Z');
  });
});
