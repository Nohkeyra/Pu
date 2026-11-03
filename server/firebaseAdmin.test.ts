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



describe('MemoryFirestore query semantics', () => {
  it('filters == and in, applies limit, and exposes document references', async () => {
    const db = getFirestore();
    const col = db.collection('query_semantics_orders');
    await col.doc('a').set({ status: 'pending', amount: 10 });
    await col.doc('b').set({ status: 'approved', amount: 20 });
    await col.doc('c').set({ status: 'completed', amount: 30 });
    const pending = await col.where('status', '==', 'pending').get();
    expect(pending.docs.map(d => d.id)).toEqual(['a']);
    const active = await col.where('status', 'in', ['pending', 'approved']).limit(1).get();
    expect(active.size).toBe(1);
    expect(['a', 'b']).toContain(active.docs[0].id);
    expect(active.docs[0].ref.id).toBe(active.docs[0].id);
  });

  it('uses immutable queries and supports numeric comparison and ordering', async () => {
    const db = getFirestore();
    const col = db.collection('query_semantics_limits');
    await col.doc('a').set({ resetTimeMs: 100 });
    await col.doc('b').set({ resetTimeMs: 300 });
    await col.doc('c').set({ resetTimeMs: 200 });
    const expired = await col.where('resetTimeMs', '<', 250).orderBy('resetTimeMs').get();
    expect(expired.docs.map(d => d.id)).toEqual(['a', 'c']);
    const recent = await col.orderBy('resetTimeMs', 'desc').limit(2).get();
    expect(recent.docs.map(d => d.id)).toEqual(['b', 'c']);
    const all = await col.get();
    expect(all.size).toBe(3);
  });
});


describe('MemoryFirestore update existence semantics', () => {
  it('does not create missing documents when using update()', async () => {
    const col = getFirestore().collection('missing_update_semantics');
    await expect(col.doc('missing').update({ status: 'approved' })).rejects.toThrow('NOT_FOUND');
    const missing = await col.doc('missing').get();
    expect(missing.exists).toBe(false);
  });

  it('does not create missing documents through batch.update()', async () => {
    const db = getFirestore();
    const ref = db.collection('missing_update_batch').doc('missing');
    const batch = db.batch();
    batch.update(ref, { status: 'approved' });
    await expect(batch.commit()).rejects.toThrow('NOT_FOUND');
    expect((await ref.get()).exists).toBe(false);
  });
});
