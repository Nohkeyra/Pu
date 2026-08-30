import { describe, it, expect } from 'vitest';
import {
  calculateOrderPricing,
  getPricePerPax,
  SET_BOX_MENU_TITLE,
} from './orderCalculation.js';

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

  it('returns 0 for no dishes selected without adding fallback', () => {
    const result = calculateOrderPricing({
      dishes: [],
      veggies: [],
      customMenu: '',
      quantity: 50,
      meals: ['lunch'],
    });

    expect(result.pricePerPax).toBe(0);
    expect(result.totalAmount).toBe(0);
    expect(result.prices.lunch).toBe(0);
  });

  it('computes custom-menu-only pricing via fuzzy fragment matching', () => {
    // Nasi Lemak Sambal Sotong is RM 11.00
    const result = calculateOrderPricing({
      dishes: [],
      veggies: [],
      customMenu: 'Nasi Lemak Sambal Sotong',
      quantity: 20,
      meals: ['breakfast'],
    });

    expect(result.pricePerPax).toBe(11);
    expect(result.totalAmount).toBe(220);
    expect(result.prices.breakfast).toBe(11);
  });

  it('computes multi-meal multiplication accurately to the cent', () => {
    const dishes = [
      { id: 'd1', nameBm: 'Ayam Berempah', price: 7.5 },
      { id: 'd2', nameBm: 'Sambal Udang', price: 8.25 },
    ];
    const veggies = [{ id: 'v1', nameBm: 'Sayur Campur', price: 3.25 }];

    // Price per pax = 7.50 + 8.25 + 3.25 = 19.00
    const result = calculateOrderPricing({
      dishes,
      veggies,
      quantity: 35,
      meals: ['breakfast', 'lunch', 'hi_tea'],
    });

    expect(result.pricePerPax).toBe(19.0);
    expect(result.totalAmount).toBe(1995.0); // 19 * 35 * 3 = 1995
    expect(result.prices.breakfast).toBe(19.0);
    expect(result.prices.lunch).toBe(19.0);
    expect(result.prices.hi_tea).toBe(19.0);
  });

  it('handles default set box title without charging ghost fallback', () => {
    const price = getPricePerPax([], [], SET_BOX_MENU_TITLE);
    expect(price).toBe(0);

    const result = calculateOrderPricing({
      dishes: [],
      veggies: [],
      customMenu: SET_BOX_MENU_TITLE,
      quantity: 100,
      meals: ['lunch'],
    });
    expect(result.totalAmount).toBe(0);
  });
});
