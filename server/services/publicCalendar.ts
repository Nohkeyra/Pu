import { getFirestore } from '../firebaseAdmin.js';
import {
  getOrderCalendarDate,
  getOrderEventDate,
  type TimestampedOrder,
} from '../../src/lib/orderTimestamp.js';
import { firestoreQuota } from './firestoreQuota.js';
interface PublicOrder {
  id: string;
  status: string;
  eventDate: string | null;
  meals: string[];
  guests: number;
}
interface CalendarRecord {
  order: PublicOrder;
  calendarDate: string | null;
}
interface SessionCount {
  count: number;
  pax: number;
}
export interface PublicCalendarData {
  orders: PublicOrder[];
  sessions: Record<string, { breakfast: SessionCount; lunch: SessionCount; hi_tea: SessionCount }>;
}
async function readPublicRecords(): Promise<CalendarRecord[]> {
  // Preserve legacy date/dateTime/createdAt records; cache only public scheduling fields.
  const snapshot = await getFirestore().collection('orders').get();
  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    if (data.deletedByAdmin) return [];
    const pax = Number(data.guests || data.quantity || 0);
    return [
      {
        order: {
          id: doc.id,
          status: typeof data.status === 'string' ? data.status : 'pending',
          eventDate: getOrderEventDate(data as TimestampedOrder),
          meals: Array.isArray(data.meals)
            ? data.meals.filter((meal): meal is string => typeof meal === 'string')
            : [],
          guests: Number.isFinite(pax) ? pax : 0,
        },
        calendarDate: getOrderCalendarDate(data as TimestampedOrder),
      },
    ];
  });
}
/** One snapshot shared across date ranges, concurrent clients and all public calendar routes. */
export class PublicCalendarService {
  private cache: { records: CalendarRecord[]; expiresAt: number } | null = null;
  private inFlight: { revision: number; promise: Promise<CalendarRecord[]> } | null = null;
  private revision = 0;
  invalidate(): void {
    this.revision++;
    this.cache = null;
  }
  private async records(): Promise<CalendarRecord[]> {
    for (;;) {
      if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.records;
      if (!this.inFlight) {
        const revision = this.revision;
        const promise = firestoreQuota.run(readPublicRecords).then((records) => {
          if (revision === this.revision) this.cache = { records, expiresAt: Date.now() + 180_000 };
          return records;
        });
        this.inFlight = { revision, promise };
      }
      const flight = this.inFlight;
      let records: CalendarRecord[];
      try {
        records = await flight.promise;
      } finally {
        if (this.inFlight === flight) this.inFlight = null;
      }
      if (flight.revision === this.revision) return records;
    }
  }
  async getData(from = '', to = ''): Promise<PublicCalendarData> {
    const records = await this.records();
    const inRange = (date: string | null) =>
      Boolean(date && (!from || date >= from) && (!to || date <= to));
    const orders = records
      .filter(({ order }) => inRange(order.eventDate))
      .map(({ order }) => ({ ...order, meals: [...order.meals] }));
    const sessions: PublicCalendarData['sessions'] = {};
    for (const { order, calendarDate } of records) {
      if (
        !calendarDate ||
        !inRange(calendarDate) ||
        ['cancelled', 'rejected'].includes(order.status)
      )
        continue;
      const day = (sessions[calendarDate] ??= {
        breakfast: { count: 0, pax: 0 },
        lunch: { count: 0, pax: 0 },
        hi_tea: { count: 0, pax: 0 },
      });
      for (const meal of ['breakfast', 'lunch', 'hi_tea'] as const) {
        const included =
          meal === 'hi_tea'
            ? order.meals.some((value) => ['hi_tea', 'hi-tea', 'tea_break'].includes(value))
            : order.meals.includes(meal);
        if (included) {
          day[meal].count++;
          day[meal].pax += order.guests;
        }
      }
    }
    return { orders, sessions };
  }
}
export const publicCalendar = new PublicCalendarService();
