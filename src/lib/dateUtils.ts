/**
 * Date Formatting Utilities
 *
 * Standard Display Format: DD/MM/YYYY (e.g. 05/01/2026) with slashes.
 * Internal Storage & Querying: YYYY-MM-DD (e.g. 2026-01-05).
 */

/** Formats supported legacy date inputs as DD/MM/YYYY. */
export function formatDateDisplay(val: unknown, fallback = '-'): string {
  const d = toJSDate(val);
  if (!d) return fallback;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

/**
 * Converts supported legacy timestamp representations to a valid Date.
 * Invalid/missing values return null; callers must not assume input validity.
 */
export function toJSDate(val: unknown): Date | null {
  if (val == null) return null;

  if (val instanceof Date) {
    return Number.isFinite(val.getTime()) ? val : null;
  }

  if (typeof val === 'object') {
    const candidate = val as {
      toDate?: () => unknown;
      seconds?: unknown;
      _seconds?: unknown;
      nanoseconds?: unknown;
      _nanoseconds?: unknown;
    };

    let toDateMethod: unknown;
    try {
      toDateMethod = candidate.toDate;
    } catch {
      toDateMethod = undefined;
    }

    if (typeof toDateMethod === 'function') {
      try {
        const converted = toDateMethod.call(val);
        if (converted instanceof Date && Number.isFinite(converted.getTime())) return converted;
      } catch {
        // Continue to the supported seconds-based representations.
      }
    }

    let seconds: number | null;
    try {
      seconds = typeof candidate.seconds === 'number'
        ? candidate.seconds
        : typeof candidate._seconds === 'number'
          ? candidate._seconds
          : null;
    } catch {
      return null;
    }

    if (seconds !== null && Number.isFinite(seconds)) {
      const d = new Date(seconds * 1000);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    return null;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // JavaScript normalizes impossible ISO calendar dates such as 2026-02-31.
    // Validate the calendar portion before allowing Date.parse to interpret it.
    const isoCalendarMatch = /^(\d{4})-(\d{2})-(\d{2})(?:[Tt ].*)?$/.exec(trimmed);
    if (isoCalendarMatch) {
      const year = Number(isoCalendarMatch[1]);
      const month = Number(isoCalendarMatch[2]);
      const day = Number(isoCalendarMatch[3]);
      const calendarDate = new Date(Date.UTC(year, month - 1, day));
      if (
        month < 1 || month > 12 || day < 1 ||
        calendarDate.getUTCFullYear() !== year ||
        calendarDate.getUTCMonth() !== month - 1 ||
        calendarDate.getUTCDate() !== day
      ) return null;
    }

    // Parse the app's DD/MM/YYYY and DD-MM-YYYY display formats strictly.
    const match = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(trimmed);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3]);
      const parsed = new Date(year, month - 1, day);
      if (
        month >= 1 && month <= 12 && day >= 1 &&
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      ) return parsed;
      return null;
    }

    const d = new Date(trimmed);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  if (typeof val === 'number' && Number.isFinite(val)) {
    // Preserve the existing convention: values above 10^11 are milliseconds,
    // smaller values are Unix seconds.
    const ms = val > 100000000000 ? val : val * 1000;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  return null;
}

/**
 * Normalizes supported timestamp inputs to Unix seconds.
 * Invalid/missing/unexpected values map to 0 (the documented oldest-sort fallback).
 */
export function normalizeTimestamp(val: unknown): number {
  const d = toJSDate(val);
  if (!d) return 0;
  const timestamp = Math.floor(d.getTime() / 1000);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * Compares timestamp values without letting invalid/missing dates distort order.
 * Invalid values sort last in either direction; valid timestamps remain chronological.
 */
export function compareTimestampValues(
  a: unknown,
  b: unknown,
  direction: 'asc' | 'desc' = 'desc',
): number {
  const dateA = toJSDate(a);
  const dateB = toJSDate(b);
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;

  const difference = dateA.getTime() - dateB.getTime();
  return direction === 'asc' ? difference : -difference;
}

/** Formats date and time as "DD/MM/YYYY @ 12:00 PM" or "DD/MM/YYYY". */
export function formatDateTimeDisplay(val: unknown, timeStr?: string, fallback = '-'): string {
  const formattedDate = formatDateDisplay(val, fallback);
  if (formattedDate === fallback) return fallback;

  if (timeStr && timeStr.trim()) return `${formattedDate} @ ${timeStr.trim()}`;

  const d = typeof val === 'string' && val.includes('T') ? toJSDate(val) : null;
  if (d) {
    const hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${formattedDate} @ ${formattedHour}:${mins} ${ampm}`;
  }
  return formattedDate;
}
