/**
 * Date Formatting Utilities
 * 
 * Standard Display Format: DD/MM/YYYY (e.g. 05/01/2026) with slashes.
 * Internal Storage & Querying: YYYY-MM-DD (e.g. 2026-01-05) to ensure
 * Firestore chronological range sorting and calendar queries remain correct.
 */

/**
 * Formats any date input (YYYY-MM-DD string, ISO string, Date instance,
 * or Firestore Timestamp object) into DD/MM/YYYY format with slashes.
 */
export function formatDateDisplay(val: unknown, fallback = '-'): string {
  const d = toJSDate(val);
  if (!d) return fallback;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converts any timestamp-like input (Date, string, Firestore Timestamp, number)
 * into a valid Javascript Date object or null if invalid.
 */
export function toJSDate(val: any): Date | null {
  if (!val) return null;

  // 1. Date instances
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // 2. Firestore Timestamp or similar object
  if (typeof val === 'object' && val !== null) {
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d;
      } catch { /* fallback */ }
    }
    // Handle both client SDK {seconds, nanoseconds} and admin SDK {_seconds, _nanoseconds}
    const seconds = typeof val.seconds === 'number' ? val.seconds : (typeof val._seconds === 'number' ? val._seconds : null);
    if (seconds !== null) {
      return new Date(seconds * 1000);
    }
  }

  // 3. String (ISO or other)
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // 1. Try explicit DD/MM/YYYY or DD-MM-YYYY (standard display format in this app)
    const ddmmyyyyMatch = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(trimmed);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // 2. Fallback to native Date parsing (handles ISO and other formats)
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // 4. Number (seconds or milliseconds)
  if (typeof val === 'number') {
    // Large number (> 10^11) is likely milliseconds (e.g. 1767571200000)
    // Small number (< 10^11) is likely seconds (e.g. 1767571200)
    const ms = val > 100000000000 ? val : val * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Normalizes any timestamp-like input (Date, string, Firestore Timestamp)
 * into a Unix timestamp (seconds) for consistent sorting and comparison.
 * Returns 0 for invalid inputs to ensure safe sorting.
 */
export function normalizeTimestamp(val: any): number {
  const d = toJSDate(val);
  if (!d) return 0;
  return Math.floor(d.getTime() / 1000);
}

/**
 * Formats date and time cleanly as "DD/MM/YYYY @ 12:00 PM" or "DD/MM/YYYY"
 */
export function formatDateTimeDisplay(val: unknown, timeStr?: string, fallback = '-'): string {
  const formattedDate = formatDateDisplay(val, fallback);
  if (formattedDate === fallback) return fallback;

  if (timeStr && timeStr.trim()) {
    return `${formattedDate} @ ${timeStr.trim()}`;
  }

  if (typeof val === 'string' && val.includes('T')) {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const hours = d.getHours();
        const mins = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHour = hours % 12 === 0 ? 12 : hours % 12;
        return `${formattedDate} @ ${formattedHour}:${mins} ${ampm}`;
      }
    } catch {
      // ignore
    }
  }

  return formattedDate;
}
