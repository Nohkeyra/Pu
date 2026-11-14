import { describe, it, expect } from 'vitest';
import type { Order } from '@/types';
import {
  getMalaysiaTodayISO,
  hasPositiveOrderPricing,
  computeAdminKpiStats,
} from './adminKpiStats';

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'ord_1',
  to: 'Org A',
  name: 'Alice',
  contact: '0123456789',
  email: 'alice@example.com',
  dateTime: '2026-11-15T04:00:00.000Z',
  eventDate: '2026-11-15',
  location: 'Putrajaya',
  quantity: 20,
  meals: ['lunch'],
  status: 'pending',
  ...overrides,
});

describe('adminKpiStats', () => {
  it('computes Malaysia UTC+8 today date cleanly across midnight boundary', () => {
    expect(getMalaysiaTodayISO(new Date('2026-11-14T15:59:59.000Z'))).toBe('2026-11-14');
    expect(getMalaysiaTodayISO(new Date('2026-11-14T16:00:00.000Z'))).toBe('2026-11-15');
  });

  it('validates positive order pricing strictly', () => {
    expect(hasPositiveOrderPricing(null)).toBe(false);
    expect(hasPositiveOrderPricing({ prices: {}, totalAmount: 0 })).toBe(false);
    expect(hasPositiveOrderPricing({ prices: { lunch: 0 }, totalAmount: 200 })).toBe(false);
    expect(hasPositiveOrderPricing({ prices: { lunch: 15 }, totalAmount: 0 })).toBe(false);
    expect(hasPositiveOrderPricing({ prices: { lunch: 15 }, totalAmount: 300 })).toBe(true);
  });

  it('aggregates Today Events, Awaiting Pricing, Active In-Transit, and Monthly Billed correctly', () => {
    // 2026-11-15 10:00 MYT = 2026-11-15T02:00:00Z
    const now = new Date('2026-11-15T02:00:00.000Z');

    const orders: Order[] = [
      // Pending today -> Today Event + Awaiting Pricing
      makeOrder({ id: 'o1', status: 'pending', quantity: 30, eventDate: '2026-11-15' }),
      // Approved without pricing today -> Today Event + Awaiting Pricing
      makeOrder({ id: 'o2', status: 'approved', quantity: 50, eventDate: '2026-11-15', prices: {}, totalAmount: 0 }),
      // Approved WITH pricing -> Today Event, NOT awaiting pricing
      makeOrder({ id: 'o3', status: 'approved', quantity: 40, eventDate: '2026-11-15', prices: { lunch: 12 }, totalAmount: 480 }),
      // Cancelled today -> Excluded from Today Events and Awaiting Pricing
      makeOrder({ id: 'o4', status: 'cancelled', quantity: 100, eventDate: '2026-11-15' }),
      // Billed this month -> Monthly Billed
      makeOrder({
        id: 'o5',
        status: 'billed',
        quantity: 25,
        eventDate: '2026-11-20',
        billedAt: '2026-11-10T03:00:00.000Z',
        prices: { lunch: 20 },
        totalAmount: 500,
      }),
      // In Transit this month (today) -> Active In-Transit + Today Event + Monthly Billed
      makeOrder({
        id: 'o6',
        status: 'in_transit',
        quantity: 15,
        eventDate: '2026-11-15',
        billedAt: '2026-11-14T16:30:00.000Z', // 2026-11-15 00:30 MYT
        prices: { lunch: 10 },
        totalAmount: 150,
      }),
      // Completed previous month -> Not in current Monthly Billed
      makeOrder({
        id: 'o7',
        status: 'completed',
        quantity: 60,
        eventDate: '2026-10-25',
        billedAt: '2026-10-25T05:00:00.000Z',
        prices: { lunch: 15 },
        totalAmount: 900,
      }),
      // Deleted by admin -> Ignored everywhere
      makeOrder({
        id: 'o8',
        deletedByAdmin: true,
        status: 'in_transit',
        quantity: 80,
        eventDate: '2026-11-15',
        totalAmount: 800,
      }),
    ];

    const stats = computeAdminKpiStats(orders, now);
    expect(stats.todaysEventsCount).toBe(4); // o1, o2, o3, o6
    expect(stats.todaysPax).toBe(135); // 30 + 50 + 40 + 15
    expect(stats.awaitingPricingCount).toBe(2); // o1 (pending), o2 (approved unpriced)
    expect(stats.inTransitCount).toBe(1); // o6
    expect(stats.monthlyBilledCount).toBe(2); // o5 + o6
    expect(stats.monthlyBilledRevenue).toBe(650); // 500 + 150
    expect(stats.currentMonthKey).toBe('2026-11');
  });
});
