import { describe, it, expect } from 'vitest';
import { formatDateDisplay, formatDateTimeDisplay, normalizeTimestamp, toJSDate } from './dateUtils';

describe('Date Formatting Utilities (DD/MM/YYYY Slashes Format)', () => {
  it('formats standard YYYY-MM-DD ISO string correctly', () => {
    expect(formatDateDisplay('2026-01-05')).toBe('05/01/2026');
    expect(formatDateDisplay('2026-12-31')).toBe('31/12/2026');
    expect(formatDateDisplay('2026-08-30')).toBe('30/08/2026');
  });

  it('formats full ISO timestamp string correctly', () => {
    expect(formatDateDisplay('2026-01-05T14:30:00.000Z')).toBe('05/01/2026');
  });

  it('converts DD-MM-YYYY dashes to DD/MM/YYYY slashes', () => {
    expect(formatDateDisplay('05-01-2026')).toBe('05/01/2026');
  });

  it('keeps already formatted DD/MM/YYYY as is', () => {
    expect(formatDateDisplay('05/01/2026')).toBe('05/01/2026');
  });

  it('handles Javascript Date objects', () => {
    const d = new Date(2026, 0, 5); // 5 Jan 2026
    expect(formatDateDisplay(d)).toBe('05/01/2026');
  });

  it('handles Firestore Timestamp objects with seconds', () => {
    const timestamp = { seconds: 1767571200, nanoseconds: 0 }; // 2026-01-05 UTC
    const formatted = formatDateDisplay(timestamp);
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });

  it('handles Firestore Timestamp objects with toDate()', () => {
    const timestampObj = {
      toDate: () => new Date(2026, 0, 5),
    };
    expect(formatDateDisplay(timestampObj)).toBe('05/01/2026');
  });

  it('returns fallback for null, undefined, empty, or invalid input', () => {
    expect(formatDateDisplay(null)).toBe('-');
    expect(formatDateDisplay(undefined)).toBe('-');
    expect(formatDateDisplay('')).toBe('-');
    expect(formatDateDisplay(null, 'N/A')).toBe('N/A');
  });

  it('formats date and time together with formatDateTimeDisplay', () => {
    expect(formatDateTimeDisplay('2026-01-05', '12:00 PM')).toBe('05/01/2026 @ 12:00 PM');
    expect(formatDateTimeDisplay('2026-01-05T15:30:00')).toBe('05/01/2026 @ 3:30 PM');
    expect(formatDateTimeDisplay(null)).toBe('-');
  });

  describe('normalizeTimestamp & toJSDate', () => {
    it('handles legacy Firestore Timestamp with .seconds', () => {
      const ts = { seconds: 1767571200, nanoseconds: 0 };
      expect(normalizeTimestamp(ts)).toBe(1767571200);
      expect(toJSDate(ts)?.getFullYear()).toBe(2026);
    });

    it('handles legacy Firestore Timestamp with ._seconds (Admin SDK)', () => {
      const ts = { _seconds: 1767571200, _nanoseconds: 0 };
      expect(normalizeTimestamp(ts)).toBe(1767571200);
    });

    it('handles ISO timestamp strings', () => {
      const iso = '2026-01-05T12:00:00Z';
      const expected = Math.floor(new Date(iso).getTime() / 1000);
      expect(normalizeTimestamp(iso)).toBe(expected);
    });

    it('handles Unix seconds (number)', () => {
      expect(normalizeTimestamp(1767571200)).toBe(1767571200);
    });

    it('handles Unix milliseconds (large number)', () => {
      expect(normalizeTimestamp(1767571200000)).toBe(1767571200);
    });

    it('handles JS Date objects', () => {
      const d = new Date(2026, 0, 5);
      expect(normalizeTimestamp(d)).toBe(Math.floor(d.getTime() / 1000));
    });

    it('handles DD/MM/YYYY strings', () => {
      expect(formatDateDisplay('05/01/2026')).toBe('05/01/2026');
      const ts = normalizeTimestamp('05/01/2026');
      const d = new Date(ts * 1000);
      expect(d.getDate()).toBe(5);
      expect(d.getMonth()).toBe(0); // Jan
    });

    it('returns 0/null for invalid values and does not crash', () => {
      expect(normalizeTimestamp(null)).toBe(0);
      expect(normalizeTimestamp(undefined)).toBe(0);
      expect(normalizeTimestamp('not-a-date')).toBe(0);
      expect(normalizeTimestamp({})).toBe(0);
      expect(toJSDate('invalid')).toBe(null);
    });

    it('facilitates correct sorting for mixed format timestamps', () => {
      const mixedOrders = [
        { id: '1', createdAt: '2026-01-01T10:00:00Z' }, // 3rd (latest)
        { id: '2', createdAt: { seconds: 1735689600, nanoseconds: 0 } }, // 2024-12-31T16:00:00Z - 1st (earliest)
        { id: '3', createdAt: new Date('2025-06-01T12:00:00Z') }, // 2nd
      ];

      const sorted = [...mixedOrders].sort((a, b) => {
        return normalizeTimestamp(b.createdAt) - normalizeTimestamp(a.createdAt);
      });

      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('2');
    });
  });
});
