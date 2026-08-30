export interface ValidationError {
  field: string;
  message: string;
}

export function validateOrderPayload(body: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
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

  const dateVal = body.eventDate || body.date || body.dateTime;
  if (!dateVal || (typeof dateVal !== 'string' && !(dateVal instanceof Date))) {
    errors.push({ field: 'date', message: 'Valid date is required' });
  }

  const qty = Number(body.quantity ?? body.guests ?? body.pax);
  if (isNaN(qty) || qty <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity / pax must be a positive number' });
  } else if (qty > 10000) {
    errors.push({ field: 'quantity', message: 'Quantity / pax exceeds maximum allowable value (10000)' });
  }

  if (body.notes && typeof body.notes === 'string' && body.notes.length > 5000) {
    errors.push({ field: 'notes', message: 'Notes exceeds maximum length (5000 characters)' });
  }

  if (body.location && typeof body.location === 'string' && body.location.length > 500) {
    errors.push({ field: 'location', message: 'Location exceeds maximum length (5000 characters)' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'rejected', 'cancelled', 'cancel_requested'],
  approved: ['billed', 'in_transit', 'cancelled', 'cancel_requested'],
  billed: ['in_transit', 'delivered', 'completed', 'cancelled', 'cancel_requested'],
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
