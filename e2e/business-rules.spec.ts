import { test, expect } from '@playwright/test';

test.describe('Business Rules for Pricing and Order Flow', () => {
  
  test('Guest cannot set a price, total amount stays 0 on submission', async ({ request }) => {
    // Attempt to submit an order with a fake totalAmount
    const payload = {
      name: 'Guest Hacker',
      contact: '0123456789',
      email: 'hacker@example.com',
      date: '2026-10-10',
      time: '12:00',
      location: 'Test Location',
      quantity: 50,
      meals: ['lunch'],
      menu: 'Set Box Makanan & Minuman',
      preparationType: 'buffet',
      notes: 'Test order',
      totalAmount: 9999.99, // Attempting to inject price
      prices: { lunch: 100 }
    };

    const res = await request.post('/api/orders', {
      data: payload
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    
    // The server should have reset the prices and totalAmount
    expect(data.totalAmount).toBe(0);
    expect(data.prices).toEqual({});
  });

});
