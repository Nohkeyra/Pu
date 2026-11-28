import type { AdminConflictNotification, Order } from '@/types';
import { getMalaysiaTodayISO, hasPositiveOrderPricing } from './adminKpiStats';
import { toJSDate } from './dateUtils';
import { isSelfPickup } from './orderCharges';
import { getOrderStatus } from './orderStatus';
import { getOrderEventDate } from './orderTimestamp';
import { otwEventMinute } from './otwSession';

export const adminOrderFilterOptions = [
  'all', 'scheduled', 'pending', 'pricing', 'approved', 'cancel_requested',
  'conflict', 'in_transit', 'invoiced', 'billed', 'delivered', 'completed', 'cancelled', 'rejected',
] as const;

export const adminSessions = ['breakfast', 'lunch', 'hi_tea', 'dinner'] as const;
type Session = (typeof adminSessions)[number];
export type AdminScheduleRange = 'today' | 'tomorrow' | 'week';

const sessionAliases: Record<string, Session> = {
  breakfast: 'breakfast', sarapan: 'breakfast',
  lunch: 'lunch', tengahari: 'lunch', tengah_hari: 'lunch', makan_tengahari: 'lunch',
  hi_tea: 'hi_tea', hitea: 'hi_tea', tea_break: 'hi_tea', tea: 'hi_tea', minum_petang: 'hi_tea',
  dinner: 'dinner', makan_malam: 'dinner',
};

export function getAdminOrderSessions(order: Order): Session[] {
  const meals = Array.isArray(order.meals) ? order.meals : [order.meals];
  const selected = new Set(meals.map((meal) => {
    const key = String(meal).toLowerCase().trim().replace(/[ -]+/g, '_');
    return Object.prototype.hasOwnProperty.call(sessionAliases, key) ? sessionAliases[key] : undefined;
  }));
  return adminSessions.filter((session) => selected.has(session));
}

export function getAdminOrderPax(order: Order): number {
  for (const value of [order.quantity, order.guests]) {
    const pax = Number(value);
    if (Number.isFinite(pax) && pax > 0) return pax;
  }
  return 0;
}

export function getAdminEventDate(order: Order): string | null {
  const explicit = getOrderEventDate({ eventDate: order.eventDate, date: order.date });
  if (explicit) return explicit;
  if (typeof order.dateTime === 'string' && /T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(order.dateTime)) {
    const instant = toJSDate(order.dateTime);
    return instant ? getMalaysiaTodayISO(instant) : null;
  }
  return getOrderEventDate({ dateTime: order.dateTime });
}

export function getAdminEventTime(order: Order): string {
  let minute = otwEventMinute(order.time);
  if (minute === null && typeof order.dateTime === 'string') {
    if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(order.dateTime)) {
      const instant = toJSDate(order.dateTime);
      if (instant) minute = (instant.getUTCHours() + 8) % 24 * 60 + instant.getUTCMinutes();
    } else {
      minute = otwEventMinute(/[T ](\d{2}:\d{2})/.exec(order.dateTime)?.[1]);
    }
  }
  if (minute === null) return '';
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

const scheduledStatuses = new Set(['approved', 'billed', 'in_transit', 'delivered', 'completed']);
const laterStatuses = new Set(['in_transit', 'delivered', 'completed']);

export function formatAdminEvent(order: Order, language: string): string {
  const eventDate = getAdminEventDate(order);
  const date = eventDate && new Intl.DateTimeFormat(language === 'bm' ? 'ms-MY' : 'en-MY', {
    dateStyle: 'medium', timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(`${eventDate}T00:00:00+08:00`));
  return [date, getAdminEventTime(order)].filter(Boolean).join(' · ');
}

function hasCompletePricing(order: Order): boolean {
  return hasPositiveOrderPricing(order) && Array.isArray(order.meals) && order.meals.length > 0 &&
    order.meals.every((meal) => {
      const price = order.prices?.[meal];
      return typeof price === 'number' && Number.isFinite(price) && price > 0;
    });
}

export function getAdminOfficialInvoiceNo(order: Order): string | undefined {
  return [order.officialInvoiceNo, order.invoiceNo].find((number) => number && /^RW\d{5,}$/.test(number));
}

function isScheduled(order: Order, status: string) {
  // A cancellation request may also originate from a pending order.
  return scheduledStatuses.has(status) ||
    (status === 'cancel_requested' && Boolean(order.approvedAt || order.billedAt || getAdminOfficialInvoiceNo(order)));
}

export function matchesAdminOrderFilter(
  order: Order, filter: string, today: string, conflictIds?: ReadonlySet<string>,
): boolean {
  if (order.deletedByAdmin) return false;
  const status = getOrderStatus(order.status, 'en').key;
  switch (filter) {
    case 'all': return true;
    case 'scheduled': return isScheduled(order, status) && getAdminEventDate(order) === today;
    case 'pricing': return status === 'approved' && !hasCompletePricing(order);
    case 'conflict': return Boolean(order.id && conflictIds?.has(order.id));
    case 'in_transit': return status === 'in_transit' && !isSelfPickup(order.delivery);
    case 'invoiced':
      return status === 'billed' || Boolean(order.billedAt || getAdminOfficialInvoiceNo(order) ||
        order.invoiceBatchNo || order.consolidatedInvoiceNo) ||
        (laterStatuses.has(status) && hasPositiveOrderPricing(order));
    default: return status === filter;
  }
}

export function getAdminConflictOrderIds(conflicts: readonly AdminConflictNotification[]): ReadonlySet<string> {
  return new Set(conflicts.map((conflict) => conflict.orderId));
}

interface OrderFilterInput {
  orders: Order[];
  searchTerm?: string;
  statusFilter?: string;
  clientFilter?: string;
  dateFromFilter?: string;
  dateToFilter?: string;
  today: string;
  conflictIds: ReadonlySet<string>;
}

export function filterAdminOrders({
  orders, searchTerm = '', statusFilter = 'all', clientFilter = 'all',
  dateFromFilter, dateToFilter, today, conflictIds,
}: OrderFilterInput): Order[] {
  const query = searchTerm.trim().toLocaleLowerCase();
  return orders.filter((order) => {
    if (!matchesAdminOrderFilter(order, statusFilter, today, conflictIds)) return false;
    if (clientFilter !== 'all' && order.to !== clientFilter) return false;
    const date = getAdminEventDate(order);
    if ((dateFromFilter || dateToFilter) &&
        (!date || (dateFromFilter && date < dateFromFilter) || (dateToFilter && date > dateToFilter))) return false;
    return !query || [
      order.id, order.orderId, order.to, order.name, order.email, order.contact, order.phone,
      order.officialInvoiceNo, order.invoiceNo, order.quoteNo, order.invoiceBatchNo,
      order.consolidatedInvoiceNo, order.location, order.menu, date,
    ].some((field) => typeof field === 'string' && field.toLocaleLowerCase().includes(query));
  });
}

export function getAdminAgenda(orders: Order[], today: string, range: AdminScheduleRange) {
  const dayAt = (offset: number) => getMalaysiaTodayISO(new Date(Date.parse(`${today}T00:00:00+08:00`) + offset * 86_400_000));
  const from = range === 'tomorrow' ? dayAt(1) : today;
  const to = range === 'week' ? dayAt(6) : from;
  const events = orders.flatMap((order) => {
    if (order.deletedByAdmin || !isScheduled(order, getOrderStatus(order.status, 'en').key)) return [];
    const date = getAdminEventDate(order);
    if (!date || date < from || date > to) return [];
    return [{ order, date, time: getAdminEventTime(order), pax: getAdminOrderPax(order), sessions: getAdminOrderSessions(order) }];
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99'));

  const sessions: Record<Session, number> = { breakfast: 0, lunch: 0, hi_tea: 0, dinner: 0 };
  let pax = 0;
  for (const event of events) {
    pax += event.pax;
    for (const session of event.sessions) sessions[session] += event.pax;
  }
  return { events, sessions, pax };
}
