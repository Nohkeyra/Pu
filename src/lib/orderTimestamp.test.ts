import { describe, expect, it } from 'vitest';
import { getOrderCalendarDate, getOrderEventDate, isOrderDateInRange, paginateSortedOrders, sortOrdersByCreatedAt } from './orderTimestamp';

describe('timestamp-aware order query results', () => {
  const records = [
    { id: 'missing', status: 'pending' },
    { id: 'newest', createdAt: '2026-11-25T10:00:00Z', eventDate: '2026-12-01' },
    { id: 'oldest', createdAt: { _seconds: 1761436800, _nanoseconds: 0 } },
    { id: 'middle', createdAt: new Date('2026-11-01T10:00:00Z') },
    { id: 'invalid', createdAt: 'invalid' },
  ];
  it('sorts all fetched records before pagination, including missing timestamps', () => {
    const sorted = sortOrdersByCreatedAt(records, 'desc');
    expect(sorted.map(o => o.id)).toEqual(['newest', 'middle', 'oldest', 'missing', 'invalid']);
    const first = paginateSortedOrders(sorted, 2);
    const second = paginateSortedOrders(sorted, 2, first.orders[1].id);
    expect(first.orders.map(o => o.id)).toEqual(['newest', 'middle']);
    expect(first.hasMore).toBe(true);
    expect(second.orders.map(o => o.id)).toEqual(['oldest', 'missing']);
    expect(second.hasMore).toBe(true);
  });
  it('sorts ascending and resolves valid legacy date fallbacks for range filters', () => {
    expect(sortOrdersByCreatedAt(records, 'asc').map(o => o.id)).toEqual(['oldest', 'middle', 'newest', 'missing', 'invalid']);
    expect(getOrderCalendarDate({ eventDate: '2026-11-25', date: '2026-11-26' })).toBe('2026-11-25');
    expect(getOrderCalendarDate({ eventDate: 'invalid', date: '25/11/2026' })).toBe('2026-11-25');
    expect(getOrderEventDate({ createdAt: '2026-11-25T10:00:00Z' })).toBeNull();
    expect(isOrderDateInRange({ createdAt: '2026-11-25T10:00:00Z' }, '2026-11-01', '2026-11-30')).toBe(false);
    expect(isOrderDateInRange({ dateTime: '2026-11-25T10:00:00Z' }, '2026-11-01', '2026-11-30')).toBe(true);
    expect(isOrderDateInRange({ date: '2026-12-01' }, '2026-11-01', '2026-11-30')).toBe(false);
    expect(isOrderDateInRange({ date: 'malformed' }, '2026-11-01', '2026-11-30')).toBe(false);
  });
});
