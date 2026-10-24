import { compareTimestampValues, toISODateString } from './dateUtils';

export interface TimestampedOrder {
  id?: string;
  createdAt?: unknown;
  eventDate?: unknown;
  date?: unknown;
  dateTime?: unknown;
}

/** Sort the complete fetched set chronologically; callers must not apply Firestore limits first. */
export function sortOrdersByCreatedAt<T extends TimestampedOrder>(orders: readonly T[], direction: 'asc' | 'desc' = 'desc'): T[] {
  return [...orders].sort((a, b) => compareTimestampValues(a.createdAt, b.createdAt, direction));
}

/** Page an already globally sorted set using the previous page's document ID. */
export function paginateSortedOrders<T extends TimestampedOrder>(sortedOrders: readonly T[], pageSize: number, lastId?: string): { orders: T[]; hasMore: boolean } {
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1);
  const cursorIndex = lastId ? sortedOrders.findIndex(order => order.id === lastId) : -1;
  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const orders = sortedOrders.slice(startIndex, startIndex + safePageSize);
  return { orders, hasMore: startIndex + orders.length < sortedOrders.length };
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
