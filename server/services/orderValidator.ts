export interface ValidationError {
  field: string;
  message: string;
}

export function validateOrderPayload(body: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!body) {
    return { valid: false, errors: [{ field: 'root', message: 'Request body is required' }] };
  }

  if (!body.customerName || typeof body.customerName !== 'string' || body.customerName.trim().length === 0) {
    errors.push({ field: 'customerName', message: 'Customer name is required' });
  }

  if (!body.contactNumber || typeof body.contactNumber !== 'string' || body.contactNumber.trim().length === 0) {
    errors.push({ field: 'contactNumber', message: 'Contact number is required' });
  }

  if (!body.eventDate || typeof body.eventDate !== 'string') {
    errors.push({ field: 'eventDate', message: 'Event date is required' });
  }

  if (!body.eventTime || typeof body.eventTime !== 'string') {
    errors.push({ field: 'eventTime', message: 'Event time is required' });
  }

  if (!body.pax || typeof body.pax !== 'number' || body.pax <= 0) {
    errors.push({ field: 'pax', message: 'Pax must be a positive number' });
  }

  if (!body.mealType || !['breakfast', 'lunch', 'tea', 'dinner'].includes(body.mealType)) {
    errors.push({ field: 'mealType', message: 'Valid meal type is required (breakfast, lunch, tea, dinner)' });
  }

  if (!Array.isArray(body.selectedDishes) || body.selectedDishes.length === 0) {
    errors.push({ field: 'selectedDishes', message: 'At least one dish must be selected' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'cancelled'],
  approved: ['billed', 'cancelled'],
  billed: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  if (currentStatus === newStatus) return true;
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}
