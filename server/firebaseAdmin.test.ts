import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getFirestore } from './firebaseAdmin.js';

describe('firebaseAdmin - getFirestore production guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws an error if USE_MEMORY_FIRESTORE is true in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.USE_MEMORY_FIRESTORE = 'true';
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    expect(() => getFirestore()).toThrow('Memory Firestore disabled in production');
  });
});

describe('generateSequentialInvoiceNo - Architectural Scheme', () => {
  it('generates sequential quotation and invoice numbers scoped by year and zero-padded', async () => {
    const { generateSequentialInvoiceNo } = await import('./firebaseAdmin.js');

    const quote1 = await generateSequentialInvoiceNo(true, '2026-05-10');
    expect(quote1).toMatch(/^QT 2026-\d{5}$/);

    const quote2 = await generateSequentialInvoiceNo(true, '2026-05-11');
    expect(quote2).toMatch(/^QT 2026-\d{5}$/);

    // Verify serial numbers increment sequentially
    const serial1 = parseInt(quote1.split('-')[1], 10);
    const serial2 = parseInt(quote2.split('-')[1], 10);
    expect(serial2).toBe(serial1 + 1);

    const invoice1 = await generateSequentialInvoiceNo(false, '2026-06-01');
    expect(invoice1).toMatch(/^RW 2026-\d{5}$/);
    const serial3 = parseInt(invoice1.split('-')[1], 10);
    expect(serial3).toBe(serial2 + 1);
  });

  it('correctly partitions counters across different fiscal years', async () => {
    const { generateSequentialInvoiceNo } = await import('./firebaseAdmin.js');

    const nextYearDoc = await generateSequentialInvoiceNo(false, '2027-01-15');
    expect(nextYearDoc).toMatch(/^RW 2027-\d{5}$/);
  });
});

