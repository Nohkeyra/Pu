import { describe, expect, it, vi } from 'vitest';
import { migrateCalendarIndex } from './calendarIndexMigration.js';

function fixture(rows: Record<string, unknown>[]) {
  const records = rows.map((data, i) => ({
    id: String(i).padStart(5, '0'), data: () => data,
    ref: { index: i }, updateTime: { seconds: i + 1, nanoseconds: 0 },
  }));
  const operations: Array<{ index: number; data: Record<string, unknown>; precondition: unknown }> = [];
  const pages: number[] = [];
  const query = (start = 0) => ({
    select: () => query(start),
    limit: (size: number) => ({
      get: async () => {
        const docs = records.slice(start, start + size);
        pages.push(docs.length);
        return { docs, size: docs.length, empty: !docs.length };
      },
      startAfter: (doc: { ref: { index: number } }) => query(doc.ref.index + 1).limit(size),
    }),
  });
  const batch = vi.fn(() => {
    const staged: typeof operations = [];
    return {
      update: (ref: { index: number }, data: Record<string, unknown>, precondition: unknown) => {
        staged.push({ index: ref.index, data, precondition });
      },
      commit: async () => {
        for (const op of staged) {
          Object.assign(rows[op.index], op.data);
          operations.push(op);
        }
      },
    };
  });
  return { db: { collection: () => query(), batch } as unknown as FirebaseFirestore.Firestore, rows, batch, operations, pages };
}

describe('calendar index migration', () => {
  it('is dry-run by default and uses cursor pages without writing original data', async () => {
    const rows = Array.from({ length: 401 }, () => ({ date: '25/11/2026', invoiceNo: 'RW original' }));
    const t = fixture(rows);
    expect(await migrateCalendarIndex(t.db)).toEqual({ scanned: 401, pending: 401, updated: 0, withoutDate: 0 });
    expect(t.pages).toEqual([400, 1]);
    expect(t.batch).not.toHaveBeenCalled();
    expect(rows[0]).toEqual({ date: '25/11/2026', invoiceNo: 'RW original' });
  });

  it('adds only the derived key, never invents a date, and is idempotent', async () => {
    const rows = [
      { date: '25/11/2026', invoiceNo: 'RW original' },
      { eventDate: '2026-11-26', calendarDateKey: '2026-11-26' },
      { createdAt: { seconds: Date.parse('2026-11-24T17:00:00Z') / 1000 } },
      { date: 'invalid' },
    ];
    const t = fixture(rows);
    expect(await migrateCalendarIndex(t.db, true)).toEqual({ scanned: 4, pending: 3, updated: 3, withoutDate: 1 });
    expect(t.operations.map(op => op.data)).toEqual([
      { calendarDateKey: '2026-11-25' }, { calendarDateKey: '2026-11-25' }, { calendarDateKey: '' },
    ]);
    expect(t.operations[0].precondition).toEqual({ lastUpdateTime: { seconds: 1, nanoseconds: 0 } });
    expect(rows[0].invoiceNo).toBe('RW original');
    expect(await migrateCalendarIndex(t.db, true)).toEqual({ scanned: 4, pending: 0, updated: 0, withoutDate: 1 });
    expect(t.batch).toHaveBeenCalledTimes(1);
  });

  it('propagates a failed commit rather than claiming completion', async () => {
    const t = fixture([{ date: '25/11/2026' }]);
    const batch = t.db.batch as unknown as ReturnType<typeof vi.fn>;
    batch.mockReturnValueOnce({ update: vi.fn(), commit: async () => { throw new Error('concurrent update'); } });
    await expect(migrateCalendarIndex(t.db, true)).rejects.toThrow('concurrent update');
    expect(t.operations).toHaveLength(0);
  });
});
