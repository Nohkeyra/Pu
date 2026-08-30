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
  if (!val) return fallback;

  // 1. String inputs
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;

    // Fast check: ISO date prefix YYYY-MM-DD (e.g. "2026-01-05" or "2026-01-05T12:00:00Z")
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}/${month}/${year}`;
    }

    // Already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // Already in DD-MM-YYYY format (convert dashes to slashes)
    const dashMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
    if (dashMatch) {
      const [, day, month, year] = dashMatch;
      return `${day}/${month}/${year}`;
    }

    // Attempt Date parse for other string representations
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return trimmed;
  }

  // 2. Date instances
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallback;
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // 3. Firestore Timestamp objects or objects with seconds/_seconds/toDate
  if (typeof val === 'object' && val !== null) {
    if ('toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
      try {
        const d = (val as { toDate: () => Date }).toDate();
        if (d instanceof Date && !isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        }
      } catch {
        // fallback
      }
    }
    if ('seconds' in val && typeof (val as { seconds: number }).seconds === 'number') {
      const d = new Date((val as { seconds: number }).seconds * 1000);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }
    if ('_seconds' in val && typeof (val as { _seconds: number })._seconds === 'number') {
      const d = new Date((val as { _seconds: number })._seconds * 1000);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }
  }

  return fallback;
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
