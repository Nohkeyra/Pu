import { describe, it, expect } from 'vitest';
import { validateOrderPayload, isValidStatusTransition } from './orderValidator';

describe('orderValidator', () => {
  it('validates status state transitions correctly', () => {
    expect(isValidStatusTransition('pending', 'approved')).toBe(true);
    expect(isValidStatusTransition('pending', 'cancelled')).toBe(true);
    expect(isValidStatusTransition('pending', 'completed')).toBe(false);
    expect(isValidStatusTransition('approved', 'billed')).toBe(true);
    expect(isValidStatusTransition('billed', 'completed')).toBe(true);
    expect(isValidStatusTransition('completed', 'pending')).toBe(false);
  });

  it('validates order payloads properly', () => {
    const invalid = validateOrderPayload({});
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);

    const valid = validateOrderPayload({
      customerName: 'Ahmad Faiz',
      contactNumber: '0123456789',
      eventDate: '2026-09-01',
      eventTime: '12:00',
      pax: 50,
      mealType: 'lunch',
      selectedDishes: [{ name: 'Ayam Berempah' }]
    });
    expect(valid.valid).toBe(true);
    expect(valid.errors).toHaveLength(0);
  });
});
