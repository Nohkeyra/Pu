import type { Order } from '@/types';
import { getOrderStatus } from './orderStatus';
import { getOrderEventDate } from './orderTimestamp';
import { toJSDate } from './dateUtils';

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

export function getMalaysiaTodayISO(now: Date = new Date()): string {
  return new Date(now.getTime() + MYT_OFFSET_MS).toISOString().slice(0, 10);
}

function toMalaysiaISODate(value: unknown): string | null {
  const date = toJSDate(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + MYT_OFFSET_MS).toISOString().slice(0, 10);
}

export function hasPositiveOrderPricing(
  order: Pick<Order, 'prices' | 'totalAmount'> | null | undefined
): boolean {
  if (
    !order ||
    typeof order.totalAmount !== 'number' ||
    !Number.isFinite(order.totalAmount) ||
    order.totalAmount <= 0
  ) {
    return false;
  }
  if (!order.prices || typeof order.prices !== 'object') {
    return false;
  }
  return Object.values(order.prices).some(
    (price) => typeof price === 'number' && Number.isFinite(price) && price > 0
  );
}

export interface AdminKpiStats {
  todaysEventsCount: number;
  todaysPax: number;
  awaitingPricingCount: number;
  inTransitCount: number;
  monthlyBilledRevenue: number;
  monthlyBilledCount: number;
  currentMonthKey: string;
}

const EXCLUDED_ACTIVE_STATUSES = new Set(['cancelled', 'rejected']);
const BILLED_PIPELINE_STATUSES = new Set(['billed', 'in_transit', 'delivered', 'completed']);

export function computeAdminKpiStats(
  orders: readonly Order[],
  now: Date = new Date()
): AdminKpiStats {
  const todayISO = getMalaysiaTodayISO(now);
  const currentMonthKey = todayISO.slice(0, 7);

  let todaysEventsCount = 0;
  let todaysPax = 0;
  let awaitingPricingCount = 0;
  let inTransitCount = 0;
  let monthlyBilledRevenue = 0;
  let monthlyBilledCount = 0;

  for (const order of orders) {
    if (!order || order.deletedByAdmin) continue;

    const status = getOrderStatus(order.status, 'en').key;
    const isCancelledOrRejected = EXCLUDED_ACTIVE_STATUSES.has(status);

    if (!isCancelledOrRejected) {
      const eventISO = getOrderEventDate(order);
      if (eventISO === todayISO) {
        todaysEventsCount += 1;
        const pax = Number(order.quantity ?? order.guests ?? 0);
        if (Number.isFinite(pax) && pax > 0) {
          todaysPax += pax;
        }
      }
    }

    if (status === 'pending' || (status === 'approved' && !hasPositiveOrderPricing(order))) {
      awaitingPricingCount += 1;
    }

    if (status === 'in_transit') {
      inTransitCount += 1;
    }

    if (BILLED_PIPELINE_STATUSES.has(status)) {
      const total = typeof order.totalAmount === 'number' && Number.isFinite(order.totalAmount)
        ? order.totalAmount
        : 0;
      if (total > 0) {
        const recordDate =
          toMalaysiaISODate(order.billedAt) ||
          getOrderEventDate(order) ||
          toMalaysiaISODate(order.approvedAt) ||
          toMalaysiaISODate(order.createdAt);
        if (recordDate && recordDate.startsWith(currentMonthKey)) {
          monthlyBilledRevenue += total;
          monthlyBilledCount += 1;
        }
      }
    }
  }

  return {
    todaysEventsCount,
    todaysPax,
    awaitingPricingCount,
    inTransitCount,
    monthlyBilledRevenue: Math.round(monthlyBilledRevenue * 100) / 100,
    monthlyBilledCount,
    currentMonthKey,
  };
}
