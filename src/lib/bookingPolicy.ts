import { getMalaysiaHolidayInfo } from '../constants/malaysiaHolidays.js';
import { toISODateString } from './dateUtils.js';

export const MIN_BUFFET_PAX = 20;
export const MIN_RESTRICTED_DAY_PAX = 60;

export function minimumServingQuantity(preparationType: unknown): number {
  return preparationType === 'buffet' ? MIN_BUFFET_PAX : 1;
}

export function isRestrictedBookingDay(date: unknown): boolean {
  const day = toISODateString(date);
  if (!day) return false;
  const weekday = new Date(day + 'T00:00:00Z').getUTCDay();
  const holiday = getMalaysiaHolidayInfo(day);
  return weekday === 0 || weekday === 6 || Boolean(holiday && holiday.type !== 'peak');
}
