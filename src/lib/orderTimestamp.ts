import { compareTimestampValues, toISODateString } from './dateUtils';

export interface TimestampedOrder {
  id?: string;
  createdAt?: unknown;
  eventDate?: unknown;
  date?: unknown;
  dateTime?: unknown;
}

/**
 * Sort chronologically with a stable document-ID tie-breaker.
 * Invalid/missing timestamps remain last in either direction.
 */
export function sortOrdersByCreatedAt<T extends TimestampedOrder>(orders: readonly T[], direction: 'asc' | 'desc' = 'desc'): T[] {
  return [...orders].sort((a, b) => {
    const timestampOrder = compareTimestampValues(a.createdAt, b.createdAt, direction);
    if (timestampOrder !== 0) return timestampOrder;
    const idA = a.id || '';
    const idB = b.id || '';
    return idA < idB ? -1 : idA > idB ? 1 : 0;
  });
}

/**
 * Page a globally sorted set using the previous page's document ID.
 * A stale/unknown cursor must not silently restart at page one, which duplicates
 * records and can cause clients to loop forever.
 */
export function paginateSortedOrders<T extends TimestampedOrder>(
  sortedOrders: readonly T[],
  pageSize: number,
  lastId?: string,
): { orders: T[]; hasMore: boolean; cursorFound: boolean } {
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1);
  const cursorIndex = lastId ? sortedOrders.findIndex(order => order.id === lastId) : -1;

  if (lastId && cursorIndex < 0) {
    return { orders: [], hasMore: false, cursorFound: false };
  }

  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const orders = sortedOrders.slice(startIndex, startIndex + safePageSize);
  return {
    orders,
    hasMore: startIndex + orders.length < sortedOrders.length,
    cursorFound: true,
  };
}

/** Resolve event-date fields without treating order creation time as an event date. */
export function getOrderEventDate(order: TimestampedOrder): string | null {
  for (const candidate of [order.eventDate, order.date, order.dateTime]) {
    const normalized = toISODateString(candidate);
    if (normalized) return normalized;
  }
  return null;
}

/** Calendar aggregation historically falls back to createdAt when all event-date fields are absent. */
export function getOrderCalendarDate(order: TimestampedOrder): string | null {
  return getOrderEventDate(order) || toISODateString(order.createdAt);
}

export function isOrderDateInRange(order: TimestampedOrder, from?: string, to?: string): boolean {
  const date = getOrderEventDate(order);
  return Boolean(date && (!from || date >= from) && (!to || date <= to));
}
