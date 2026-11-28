import { describe, expect, it } from 'vitest';
import type { Order } from '@/types';
import {
  filterAdminOrders, getAdminAgenda, getAdminEventDate, getAdminEventTime,
  getAdminOfficialInvoiceNo, matchesAdminOrderFilter,
} from './adminOrderFilters';

const today = '2026-11-28';
function order(values: Partial<Order>): Order {
  return {
    to: 'Putrajaya', name: 'Fixture', contact: '', email: '', dateTime: '', location: '',
    quantity: 0, meals: [], ...values,
  };
}

describe('admin agenda and order filters', () => {
  it('keeps Malaysian calendar dates and sorts by local time, with unknown times last', () => {
    const overnight = order({ id: 'overnight', status: 'approved', dateTime: '2026-11-27T16:30:00Z' });
    const explicit = order({ id: 'explicit', status: 'approved', eventDate: today, time: '9:15 AM' });
    const unknownTime = order({ id: 'unknown', status: 'approved', eventDate: today });
    const submittedOnly = order({ status: 'approved', createdAt: '2026-11-28T00:00:00Z' });

    expect(getAdminEventDate(overnight)).toBe(today);
    expect(getAdminEventTime(overnight)).toBe('00:30');
    expect(getAdminEventDate(submittedOnly)).toBeNull();
    expect(getAdminAgenda([unknownTime, explicit, overnight, submittedOnly], today, 'today').events.map(({ order }) => order.id))
      .toEqual(['overnight', 'explicit', 'unknown']);
  });

  it('counts each event once and each selected session once, including legacy quantities', () => {
    const records = [
      order({ id: 'two-sessions', status: 'approved', eventDate: today, quantity: 26, meals: ['lunch', 'tengah_hari', 'hi-tea'] }),
      order({ id: 'legacy', status: 'delivered', eventDate: '29/11/2026', guests: 40, meals: ['sarapan'] }),
      order({ id: 'last', status: 'completed', eventDate: '2026-12-04', quantity: 3, meals: ['dinner'] }),
      order({ id: 'outside', status: 'approved', eventDate: '2026-12-05', quantity: 100 }),
    ];
    expect(getAdminAgenda(records, today, 'today')).toMatchObject({
      pax: 26, sessions: { breakfast: 0, lunch: 26, hi_tea: 26, dinner: 0 },
    });
    expect(getAdminAgenda(records, today, 'tomorrow')).toMatchObject({ pax: 40, sessions: { breakfast: 40 } });
    expect(getAdminAgenda(records, today, 'week')).toMatchObject({
      pax: 69, sessions: { breakfast: 40, lunch: 26, hi_tea: 26, dinner: 3 },
    });
  });

  it('keeps previously approved events scheduled while a cancellation is under review', () => {
    const records = [
      order({ id: 'approved-cancel', eventDate: today, status: 'cancel_requested', approvedAt: '2026-11-25' }),
      order({ id: 'pending-cancel', eventDate: today, status: 'cancel_requested' }),
      order({ id: 'cancelled', eventDate: today, status: 'cancelled' }),
      order({ id: 'hidden', eventDate: today, status: 'approved', deletedByAdmin: true }),
    ];
    const visible = filterAdminOrders({ orders: records, today, statusFilter: 'scheduled', conflictIds: new Set() });
    expect(visible.map(({ id }) => id)).toEqual(['approved-cancel']);
    expect(getAdminAgenda(records, today, 'today').events.map(({ order }) => order.id)).toEqual(visible.map(({ id }) => id));
  });

  it('uses the same operational predicates for counts and lists', () => {
    const records = [
      order({ id: 'new', status: 'pending' }),
      order({ id: 'unpriced', status: 'approved', prices: { lunch: 0 }, totalAmount: 0 }),
      order({ id: 'priced', status: 'approved', meals: ['lunch'], prices: { lunch: 12 }, totalAmount: 240 }),
      order({ id: 'partial', status: 'approved', meals: ['lunch', 'hi_tea'], prices: { lunch: 12 }, totalAmount: 240 }),
      order({ id: 'rider', status: 'in_transit', delivery: { method: 'delivery' } }),
      order({ id: 'pickup', status: 'in_transit', delivery: { method: 'pickup' } }),
    ];
    const conflictIds = new Set(['rider', 'missing']);
    for (const [statusFilter, ids] of [
      ['pending', ['new']], ['pricing', ['unpriced', 'partial']], ['conflict', ['rider']], ['in_transit', ['rider']],
    ] as const) {
      expect(filterAdminOrders({ orders: records, today, conflictIds, statusFilter }).map(({ id }) => id)).toEqual(ids);
    }
  });

  it('distinguishes invoiced orders and stored individual invoice numbers from quotes and batch references', () => {
    const consolidated = order({ status: 'completed', invoiceBatchNo: 'BATCH-1' });
    const quote = order({ status: 'approved', quoteNo: 'QT00012', invoiceNo: 'QT00012' });
    expect(matchesAdminOrderFilter(consolidated, 'invoiced', today)).toBe(true);
    expect(matchesAdminOrderFilter(quote, 'invoiced', today)).toBe(false);
    expect(matchesAdminOrderFilter(order({ status: 'in_transit' }), 'invoiced', today)).toBe(false);
    expect(getAdminOfficialInvoiceNo(consolidated)).toBeUndefined();
    expect(getAdminOfficialInvoiceNo(quote)).toBeUndefined();
    expect(getAdminOfficialInvoiceNo(order({ officialInvoiceNo: 'RW00050', invoiceNo: 'QT00050' }))).toBe('RW00050');
    expect(filterAdminOrders({ orders: [consolidated, quote], today, conflictIds: new Set(), searchTerm: ' QT00012 ' })).toEqual([quote]);
  });
});
