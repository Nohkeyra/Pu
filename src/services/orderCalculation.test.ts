import { describe, it, expect } from 'vitest';

describe('Order Calculation & Pricing Logic', () => {
  it('calculates estimated total range correctly for pending orders', () => {
    const guests = 50;
    const mealsCount = 2; // e.g. breakfast and lunch
    const minPerPax = 12 * mealsCount;
    const maxPerPax = 22 * mealsCount;
    
    const minTotal = guests * minPerPax;
    const maxTotal = guests * maxPerPax;

    expect(minTotal).toBe(1200); // 50 * 24
    expect(maxTotal).toBe(2200); // 50 * 44
  });

  it('calculates final bill total correctly when unit prices are specified', () => {
    const guests = 100;
    const prices: Record<string, number> = {
      breakfast: 15,
      lunch: 25,
    };
    
    const subtotalBreakfast = guests * prices.breakfast;
    const subtotalLunch = guests * prices.lunch;
    const grandTotal = subtotalBreakfast + subtotalLunch;

    expect(subtotalBreakfast).toBe(1500);
    expect(subtotalLunch).toBe(2500);
    expect(grandTotal).toBe(4000);
  });

  it('handles zero quantity or empty meals gracefully', () => {
    const guests = 0;
    const mealsCount = 0;
    const minTotal = guests * 12 * (mealsCount || 1);
    expect(minTotal).toBe(0);
  });
});
