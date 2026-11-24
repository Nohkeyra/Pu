import { describe, expect, it } from 'vitest';
import { calculateOrderCharges, initialOrderCharges, orderFoodSubtotal } from './orderCharges';

describe('Wawasan invoice charges', () => {
  it('calculates service charge on food only, separately from delivery', () => {
    const subtotal = orderFoodSubtotal({ breakfast: 8, lunch: 12.5 }, 20);
    expect(calculateOrderCharges(subtotal, { preparationType: 'buffet', serviceChargeRate: 10, deliveryCharge: 15 })).toEqual({
      foodSubtotal: 410, deliveryCharge: 15, serviceChargeRate: 10, serviceChargeAmount: 41, totalAmount: 466,
    });
  });
  it('defaults new buffet orders to 10%, meal boxes to zero, and preserves historical totals', () => {
    expect(initialOrderCharges('buffet').serviceChargeRate).toBe(10);
    expect(initialOrderCharges('meal_box').serviceChargeRate).toBe(0);
    expect(calculateOrderCharges(100, { preparationType: 'buffet' }).totalAmount).toBe(100);
  });
  it('allows a waiver but rejects pickup delivery fees and meal-box service charges', () => {
    expect(calculateOrderCharges(100, { preparationType: 'buffet', delivery: 'pickup', serviceChargeRate: 0 }).totalAmount).toBe(100);
    expect(() => calculateOrderCharges(100, { delivery: 'pickup', deliveryCharge: 5 })).toThrow();
    expect(() => calculateOrderCharges(100, { preparationType: 'meal_box', serviceChargeRate: 10 })).toThrow();
  });
  it('uses exact cent-based subtotals and rejects invalid unit prices or fractional pax', () => {
    expect(orderFoodSubtotal({ breakfast: 0.29, lunch: 12.35 }, 60)).toBe(758.4);
    expect(() => orderFoodSubtotal({ lunch: 12.345 }, 30)).toThrow('Invalid unit price');
    expect(() => orderFoodSubtotal({ lunch: 12.35 }, 1.5)).toThrow('Invalid quantity');
  });
  it('rounds monetary amounts to cents', () => {
    expect(calculateOrderCharges(10.05, { preparationType: 'buffet', serviceChargeRate: 10 }).totalAmount).toBe(11.06);
  });
});
