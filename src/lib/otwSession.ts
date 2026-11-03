/**
 * Pure, side-effect-free eligibility rules for Wawasan group OTW.
 * This module does NOT update orders or start GPS tracking.
 */
export type OtwMealSession = 'breakfast' | 'lunch' | 'hi_tea';
export const OTW_AUTO_CLOSE_MS = 60 * 60 * 1000;

export interface OtwCandidate {
  id?: string;
  eventDate?: unknown;
  date?: unknown;
  dateTime?: unknown;
  time?: unknown;
  status?: string;
  deletedByAdmin?: boolean;
}

/** Date of an instant in Malaysia, independent of the server/device timezone. */
export function malaysiaDate(now: Date): string {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid clock');
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

function validISODate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() + 1 === m && parsed.getUTCDate() === d ? value : null;
}

/**
 * Use explicit eventDate/date first. ISO instants are converted to Malaysia date;
 * date-only strings are never converted through UTC (avoids day-shift).
 */
export function otwEventDate(order: OtwCandidate): string | null {
  for (const field of [order.eventDate, order.date]) {
    const exact = validISODate(field);
    if (exact) return exact;
    if (field !== undefined && field !== null && field !== '') return null; // fail closed
  }
  if (typeof order.dateTime === 'string') {
    const exact = validISODate(order.dateTime);
    if (exact) return exact;
    if (!/T\d{2}:\d{2}/.test(order.dateTime) || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(order.dateTime)) return null;
    const instant = new Date(order.dateTime);
    return Number.isFinite(instant.getTime()) ? malaysiaDate(instant) : null;
  }
  return null;
}

/** Only unambiguous 24h HH:mm or 12h h:mm AM/PM event times. */
export function otwEventMinute(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const h24 = /^(\d{1,2}):(\d{2})(?::00)?$/.exec(text);
  if (h24) {
    const h = Number(h24[1]), m = Number(h24[2]);
    return h < 24 && m < 60 ? h * 60 + m : null;
  }
  const h12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(text);
  if (h12) {
    const h = Number(h12[1]), m = Number(h12[2]);
    return h >= 1 && h <= 12 && m < 60 ? ((h % 12) + (h12[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + m : null;
  }
  return null;
}

export function otwSessionForMinute(minute: number): OtwMealSession | null {
  if (!Number.isInteger(minute) || minute < 0 || minute >= 1440) return null;
  if (minute <= 10 * 60) return 'breakfast';
  if (minute <= 14 * 60) return 'lunch';
  return 'hi_tea';
}

/**
 * Preview only. Caller MUST restrict to actual delivery orders and verify admin
 * permissions on the server before applying changes. Never use as sole auth.
 */
export function selectOtwOrders<T extends OtwCandidate>(
  orders: readonly T[], date: string, session: OtwMealSession,
  isDeliveryOrder: (order: T) => boolean,
): T[] {
  if (!validISODate(date)) return [];
  const seen = new Set<string>();
  return orders.filter(order => {
    if (!order.id || seen.has(order.id) || order.deletedByAdmin) return false;
    if (!['approved', 'billed'].includes((order.status || '').trim().toLowerCase())) return false;
    if (!isDeliveryOrder(order) || otwEventDate(order) !== date) return false;
    const minute = otwEventMinute(order.time);
    if (minute === null || otwSessionForMinute(minute) !== session) return false;
    seen.add(order.id);
    return true;
  });
}

/** Server-side scheduling should persist this deadline and execute it reliably. */
export function otwAutoCloseAt(startedAt: Date): string {
  if (!Number.isFinite(startedAt.getTime())) throw new Error('Invalid OTW start time');
  return new Date(startedAt.getTime() + OTW_AUTO_CLOSE_MS).toISOString();
}
