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
    expect(isValidStatusTransition('delivered', 'in_transit')).toBe(false);
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

    const result = validateOrderPayload(validPayload);
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
