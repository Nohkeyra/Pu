import { toISODateString, toMalaysiaDateTime } from '../../src/lib/dateUtils.js';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateOrderPayload(body: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: [{ field: 'root', message: 'Request body is required' }] };
  }

  const name = body.name || body.customerName;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Customer name is required' });
  } else if (name.length > 200) {
    errors.push({ field: 'name', message: 'Customer name exceeds maximum length (200 characters)' });
  }

  const contact = body.contact || body.contactNumber || body.phone;
  const email = body.email || body.customerEmail;
  if ((!contact || typeof contact !== 'string' || contact.trim().length === 0) &&
      (!email || typeof email !== 'string' || email.trim().length === 0)) {
    errors.push({ field: 'contact', message: 'At least one contact method (contact phone or email) is required' });
  }

  if (contact && typeof contact === 'string' && contact.length > 50) {
    errors.push({ field: 'contact', message: 'Contact number exceeds maximum length (50 characters)' });
  }

  if (email && typeof email === 'string' && email.length > 150) {
    errors.push({ field: 'email', message: 'Email exceeds maximum length (150 characters)' });
  }

  // Date.parse alone can normalize impossible dates; reuse the strict app date utility.
  const dateVal = body.eventDate ?? body.date ?? body.dateTime;
  if ((typeof dateVal !== 'string' && !(dateVal instanceof Date)) || !toISODateString(dateVal)) {
    errors.push({ field: 'date', message: 'Valid date is required' });
  }
  const eventTime = body.time ?? body.eventTime;
  if (eventTime !== undefined && !toMalaysiaDateTime(dateVal, eventTime)) {
    errors.push({ field: 'time', message: 'Valid event time (HH:mm) is required' });
  }

  // Pax represent people: reject fractions, non-finite values and object coercion.
  const rawQuantity = body.quantity ?? body.guests ?? body.pax;
  const qty = (typeof rawQuantity === 'string' || typeof rawQuantity === 'number') ? Number(rawQuantity) : NaN;
  if (!Number.isSafeInteger(qty) || qty <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity / pax must be a positive whole number' });
  } else if (qty > 10000) {
    errors.push({ field: 'quantity', message: 'Quantity / pax exceeds maximum allowable value (10000)' });
  }

  if (body.notes && typeof body.notes === 'string' && body.notes.length > 5000) {
    errors.push({ field: 'notes', message: 'Notes exceeds maximum length (5000 characters)' });
  }

  if (body.location && typeof body.location === 'string' && body.location.length > 500) {
    errors.push({ field: 'location', message: 'Location exceeds maximum length (500 characters)' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'billed', 'rejected', 'cancelled', 'cancel_requested'],
  approved: ['billed', 'in_transit', 'delivered', 'cancelled', 'cancel_requested'],
  billed: ['approved', 'in_transit', 'delivered', 'completed', 'cancelled', 'cancel_requested'],
  in_transit: ['delivered', 'completed', 'cancelled'],
  delivered: ['completed'],
  cancel_requested: ['cancelled', 'approved', 'billed', 'rejected'],
  completed: [],
  rejected: [],
  cancelled: []
};

export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const normCurrent = (currentStatus || '').toLowerCase().trim();
  const normNew = (newStatus || '').toLowerCase().trim();

  // Check if both statuses are recognized in the state machine
  if (!Object.prototype.hasOwnProperty.call(VALID_STATUS_TRANSITIONS, normCurrent)) {
    return false;
  }
  if (!Object.prototype.hasOwnProperty.call(VALID_STATUS_TRANSITIONS, normNew)) {
    return false;
  }

  if (normCurrent === normNew) {
    return true;
  }

  const allowed = VALID_STATUS_TRANSITIONS[normCurrent];
  return allowed ? allowed.includes(normNew) : false;
}
