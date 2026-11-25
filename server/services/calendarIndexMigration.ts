import { getOrderCalendarDate } from '../../src/lib/orderTimestamp.js';

export interface CalendarIndexMigrationResult {
  scanned: number;
  pending: number;
  updated: number;
  withoutDate: number;
}

/**
 * Only backfill a derived index field. Never overwrite original dates, statuses,
 * creation timestamps or invoice data. A concurrent write aborts the batch;
 * rerunning is safe and re-evaluates the current record.
 */
export async function migrateCalendarIndex(db: FirebaseFirestore.Firestore, apply = false): Promise<CalendarIndexMigrationResult> {
  const result: CalendarIndexMigrationResult = { scanned: 0, pending: 0, updated: 0, withoutDate: 0 };
  const pageSize = 400;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection('orders').limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    const changes: { doc: FirebaseFirestore.QueryDocumentSnapshot; key: string }[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const key = getOrderCalendarDate(data) ?? '';
      result.scanned++;
      if (!key) result.withoutDate++;
      if (data.calendarDateKey !== key) {
        result.pending++;
        changes.push({ doc, key });
      }
    }
    if (apply && changes.length) {
      const batch = db.batch();
      for (const { doc, key } of changes) {
        if (!doc.updateTime) throw new Error('Missing updateTime; refusing unsafe migration.');
        batch.update(doc.ref, { calendarDateKey: key }, { lastUpdateTime: doc.updateTime });
      }
      await batch.commit();
      result.updated += changes.length;
    }
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < pageSize) break;
  }
  return result;
}
