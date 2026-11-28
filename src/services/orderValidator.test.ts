import { describe, it, expect } from 'vitest';
import {
  isValidStatusTransition,
  validateOrderPayload,
} from '../../server/services/orderValidator.js';

describe('Order Validator & Status State Machine', () => {
  it('allows valid status transitions', () => {
    expect(isValidStatusTransition('pending', 'approved')).toBe(true);
    expect(isValidStatusTransition('pending', 'rejected')).toBe(true);
    expect(isValidStatusTransition('pending', 'cancelled')).toBe(true);
    expect(isValidStatusTransition('pending', 'cancel_requested')).toBe(true);

    expect(isValidStatusTransition('approved', 'billed')).toBe(true);
    expect(isValidStatusTransition('approved', 'in_transit')).toBe(true);
    expect(isValidStatusTransition('approved', 'delivered')).toBe(true);
    expect(isValidStatusTransition('approved', 'cancel_requested')).toBe(true);

    expect(isValidStatusTransition('billed', 'in_transit')).toBe(true);
    expect(isValidStatusTransition('billed', 'delivered')).toBe(true);
    expect(isValidStatusTransition('billed', 'completed')).toBe(true);
    expect(isValidStatusTransition('billed', 'cancel_requested')).toBe(true);

    expect(isValidStatusTransition('in_transit', 'delivered')).toBe(true);
    expect(isValidStatusTransition('in_transit', 'completed')).toBe(true);
    expect(isValidStatusTransition('in_transit', 'cancelled')).toBe(true);

    expect(isValidStatusTransition('delivered', 'completed')).toBe(true);

    // Cancel requested transitions
    expect(isValidStatusTransition('cancel_requested', 'cancelled')).toBe(true);
    expect(isValidStatusTransition('cancel_requested', 'approved')).toBe(true);
    expect(isValidStatusTransition('cancel_requested', 'billed')).toBe(true);
    expect(isValidStatusTransition('cancel_requested', 'rejected')).toBe(true);
  });

  it('allows same-status transitions for valid known statuses', () => {
    expect(isValidStatusTransition('pending', 'pending')).toBe(true);
    expect(isValidStatusTransition('billed', 'billed')).toBe(true);
    expect(isValidStatusTransition('completed', 'completed')).toBe(true);
  });

  it('rejects invalid or backward transitions', () => {
    expect(isValidStatusTransition('completed', 'pending')).toBe(false);
    expect(isValidStatusTransition('rejected', 'approved')).toBe(false);
    expect(isValidStatusTransition('cancelled', 'pending')).toBe(false);
    expect(isValidStatusTransition('delivered', 'pending')).toBe(false);
  });

  it('strictly rejects unknown or unmapped statuses', () => {
    expect(isValidStatusTransition('unknown', 'pending')).toBe(false);
    expect(isValidStatusTransition('pending', 'unknown')).toBe(false);
    expect(isValidStatusTransition('unknown', 'unknown')).toBe(false);
    expect(isValidStatusTransition('refunded', 'cancelled')).toBe(false);
    expect(isValidStatusTransition('pending', 'refunded')).toBe(false);
  });

  it('validates a complete order payload successfully', () => {
    const validPayload = {
      name: 'Ahmad Albab',
      contact: '+60123456789',
      email: 'ahmad@example.com',
      eventDate: '2026-09-15',
      time: '12:30',
      quantity: 50,
      meals: ['lunch'],
    };

    const result = validateOrderPayload(validPayload, Date.parse('2026-09-14T12:00:00+08:00'));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('catches missing required fields and boundary violations', () => {
    const invalidPayload = {
      name: '',
      contact: '',
      email: '',
      quantity: -5,
    };

    const result = validateOrderPayload(invalidPayload);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'name')).toBe(true);
    expect(result.errors.some(e => e.field === 'contact')).toBe(true);
    expect(result.errors.some(e => e.field === 'date')).toBe(true);
    expect(result.errors.some(e => e.field === 'quantity')).toBe(true);
  });
});

describe('Server quantity-based notice enforcement', () => {
  const now = Date.parse('2026-11-24T21:00:00+08:00');
  const order = { name: 'Test', contact: '0123456789', eventDate: '2026-11-25', time: '08:59' };
  it('accepts 1 and 29 packs, rejects 30 and 31 before the cutoff', () => {
    for (const quantity of [1, 29]) expect(validateOrderPayload({ ...order, quantity }, now).valid).toBe(true);
    for (const quantity of [30, 31]) expect(validateOrderPayload({ ...order, quantity }, now).valid).toBe(false);
  });
  it('accepts 30 at exactly 12 hours and rejects past orders', () => {
    expect(validateOrderPayload({ ...order, quantity: 30, time: '09:00' }, now).valid).toBe(true);
    expect(validateOrderPayload({ ...order, quantity: 1, eventDate: '2026-11-24', time: '20:59' }, now).valid).toBe(false);
  });
});

describe('Wawasan minimum quantities', () => {
  const now = Date.parse('2026-11-24T10:00:00+08:00');
  const order = { name: 'Test', contact: '0123456789', eventDate: '2026-11-26', time: '12:00' };
  it('enforces the buffet minimum of 20 on a weekday', () => {
    expect(validateOrderPayload({ ...order, preparationType: 'buffet', quantity: 19 }, now).valid).toBe(false);
    expect(validateOrderPayload({ ...order, preparationType: 'buffet', quantity: 20 }, now).valid).toBe(true);
  });
  it('enforces 60 pax on Saturdays, Sundays, and Putrajaya holidays', () => {
    for (const eventDate of ['2026-11-28', '2026-11-29', '2026-12-25', '2027-02-08']) {
      expect(validateOrderPayload({ ...order, eventDate, quantity: 59 }, now).valid).toBe(false);
      expect(validateOrderPayload({ ...order, eventDate, quantity: 60 }, now).valid).toBe(true);
    }
  });
});


describe('Meal selection validation', () => {
  const now = Date.parse('2026-11-24T10:00:00+08:00');
  const order = { name: 'Test', contact: '0123456789', eventDate: '2026-11-26', time: '12:00', quantity: 20 };
  it('rejects malformed, duplicate, unknown and empty meal selections', () => {
    for (const meals of [null, [], 'lunch', [12], ['lunch', 'lunch'], ['unknown'], ['default', 'lunch']]) {
      expect(validateOrderPayload({ ...order, meals }, now).errors.some(error => error.field === 'meals')).toBe(true);
    }
  });
  it('accepts existing app meal keys and legacy single-meal requests', () => {
    expect(validateOrderPayload({ ...order, meals: ['breakfast', 'lunch', 'hi_tea', 'tea_break'] }, now).valid).toBe(true);
    expect(validateOrderPayload({ ...order, mealType: 'dinner' }, now).valid).toBe(true);
    expect(validateOrderPayload(order, now).valid).toBe(true);
  });
});
