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
async function readPublicRecords(range?: { from: string; to: string }): Promise<CalendarRecord[]> {
  // Preserve legacy date/dateTime/createdAt records; cache only public scheduling fields.
  const collection = getFirestore().collection('orders');
  // Project scheduling fields only; legacy dates remain supported. The
  // in-memory test adapter does not implement select().
  const query = range
    ? collection.where('calendarDateKey', '>=', range.from).where('calendarDateKey', '<=', range.to)
    : collection;
  const snapshot = await (typeof query.select === 'function'
    ? query.select('eventDate', 'date', 'dateTime', 'createdAt', 'deletedByAdmin', 'guests', 'quantity', 'status', 'meals')
    : query).get();
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
// A bounded request may use the new index only after a verified backfill.
type ReadRange = { from: string; to: string };
function indexedRange(from: string, to: string): ReadRange | undefined {
  if (!from || !to || Date.parse(to) - Date.parse(from) > 93 * 86_400_000) return undefined;
  // Bucket ranges to whole months to share reads across different callers.
  const start = from.slice(0, 7) + '-01';
  const endMonth = to.slice(0, 7);
  const [year, month] = endMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: start, to: endMonth + '-' + String(lastDay).padStart(2, '0') };
}

/** Shared, revision-aware cache; legacy full reads remain available before migration. */
export class PublicCalendarService {
  private cache = new Map<string, { records: CalendarRecord[]; expiresAt: number }>();
  private inFlight = new Map<string, { revision: number; promise: Promise<CalendarRecord[]> }>();
  private revision = 0;
  private readonly indexReady: () => boolean;
  constructor(indexReady = () => process.env.FIRESTORE_CALENDAR_INDEX_READY === 'true') {
    this.indexReady = indexReady;
  }
  invalidate(): void {
    this.revision++;
    this.cache.clear();
  }
  private async records(from: string, to: string): Promise<CalendarRecord[]> {
    const range = this.indexReady() ? indexedRange(from, to) : undefined;
    const key = range ? range.from + ':' + range.to : '*';
    for (;;) {
      const now = Date.now();
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > now) return cached.records;
      this.cache.delete(key);
      let flight = this.inFlight.get(key);
      if (!flight) {
        const revision = this.revision;
        const promise = firestoreQuota.run(() => readPublicRecords(range)).then((records) => {
          if (revision === this.revision) {
            for (const [k, entry] of this.cache) if (entry.expiresAt <= Date.now()) this.cache.delete(k);
            // Bound memory when many different months are requested.
            if (this.cache.size >= 12) {
              const first = this.cache.keys().next().value;
              if (first !== undefined) this.cache.delete(first);
            }
            this.cache.set(key, { records, expiresAt: Date.now() + 180_000 });
          }
          return records;
        });
        flight = { revision, promise };
        this.inFlight.set(key, flight);
      }
      let records: CalendarRecord[];
      try {
        records = await flight.promise;
      } finally {
        if (this.inFlight.get(key) === flight) this.inFlight.delete(key);
      }
      if (flight.revision === this.revision) return records;
    }
  }
  async getData(from = '', to = ''): Promise<PublicCalendarData> {
    const records = await this.records(from, to);
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
