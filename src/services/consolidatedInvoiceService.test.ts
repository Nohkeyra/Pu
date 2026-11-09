import { describe, it, expect } from 'vitest';
import { generateConsolidatedInvoicePDF } from './consolidatedInvoiceService';
import { planInvoicePages } from './invoiceBatchPdf';
import { validateInvoiceGroup, invoiceAmountCents } from '../lib/invoiceBatch';
import type { Order } from '@/types';
const order: Order = {
  id: 'one',
  name: 'Contoh',
  to: 'Agensi Contoh',
  billingAddress: 'Aras 1, Putrajaya',
  email: 'contoh@example.com',
  contact: '0173157721',
  dateTime: '2026-11-01T08:00',
  location: 'Dewan',
  quantity: 25,
  meals: ['lunch'],
  prices: { lunch: 10.1 },
  totalAmount: 252.5,
  menu: 'Nasi, ayam dan sayur',
  notes: 'Nota contoh',
};
const issuedAt = '2026-11-09T04:00:00Z';
describe('Saved invoice pagination', () => {
  it('keeps every order and exact cents on individually numbered pages', () => {
    const orders = Array.from({ length: 35 }, (_, i) => ({
      ...order,
      id: `order_${i}`,
      notes:
        'Catatan panjang untuk memastikan pembahagian halaman dibuat sebelum ruang jumlah dan footer.',
    }));
    const recipient = validateInvoiceGroup(orders),
      options = { recipient, includeNotes: true, lang: 'bm' as const, issuedAt };
    const plan = planInvoicePages(orders, options),
      pages = plan.map((page, i) => ({ ...page, invoiceNo: `RW 2026-${i + 1}` }));
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap((p) => p.orderIds)).toEqual(orders.map((o) => o.id));
    expect(pages.reduce((sum, p) => sum + p.totalCents, 0)).toBe(35 * 25250);
    const doc = generateConsolidatedInvoicePDF({ orders, ...options, pages });
    expect(doc.getNumberOfPages()).toBe(pages.length);
    expect(planInvoicePages(orders, options)).toEqual(plan);
  });
  it('requires saved serials rather than inventing a random official number', () => {
    expect(() => generateConsolidatedInvoicePDF({ orders: [order], includeNotes: false })).toThrow(
      /Saved invoice/
    );
  });
  it('rejects duplicate numbers or changed totals', () => {
    const options = {
      orders: [order],
      includeNotes: false,
      recipient: validateInvoiceGroup([order]),
      issuedAt,
      pages: [{ invoiceNo: 'RW 1', orderIds: ['one'], totalCents: 1 }],
    };
    expect(() => generateConsolidatedInvoicePDF(options)).toThrow(/total mismatch/);
    expect(() =>
      generateConsolidatedInvoicePDF({
        ...options,
        orders: [order, { ...order, id: 'two' }],
        pages: [
          { invoiceNo: 'RW 1', orderIds: ['one'], totalCents: 25250 },
          { invoiceNo: 'RW 1', orderIds: ['two'], totalCents: 25250 },
        ],
      })
    ).toThrow(/distinct/);
  });
  it('matches case and whitespace but rejects different customers, addresses or emails', () => {
    expect(
      validateInvoiceGroup([
        order,
        {
          ...order,
          to: '  AGENSI  CONTOH ',
          email: 'CONTOH@EXAMPLE.COM',
          billingAddress: ' ARAS 1, PUTRAJAYA ',
        },
      ]).email
    ).toBe('contoh@example.com');
    for (const changed of [
      { to: 'Agensi lain' },
      { billingAddress: 'Alamat lain' },
      { email: 'lain@example.com' },
    ])
      expect(() => validateInvoiceGroup([order, { ...order, ...changed }])).toThrow(/must match/);
    expect(() => validateInvoiceGroup([{ ...order, billingAddress: '' }])).toThrow(
      /billing address/
    );
  });
  it('rejects oversize content rather than clipping a row or issuing an extra summary invoice', () => {
    expect(() =>
      planInvoicePages([{ ...order, notes: 'Very long '.repeat(1000) }], {
        recipient: validateInvoiceGroup([order]),
        includeNotes: true,
        lang: 'en',
        issuedAt,
      })
    ).toThrow(/exceed one page/);
    expect(invoiceAmountCents({ ...order, totalAmount: 0.1 + 0.2 })).toBe(30);
  });
});
