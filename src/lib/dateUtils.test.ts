import { describe, it, expect } from 'vitest';
import { formatDateDisplay, formatDateTimeDisplay } from './dateUtils';

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
});
