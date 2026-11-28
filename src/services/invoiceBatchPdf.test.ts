import { describe, it, expect } from 'vitest';
import { planInvoicePages } from './invoiceBatchPdf';
import { drawRefinedBatch, refinedBatchLayout } from './refinedInvoiceBatch';
import { jsPDF } from 'jspdf';
const landscape = () => new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
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
      pages = plan.map((page, i) => ({ ...page, invoiceNo: `RW${String(54000+i)}` }));
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap((p) => p.orderIds)).toEqual(orders.map((o) => o.id));
    expect(pages.reduce((sum, p) => sum + p.totalCents, 0)).toBe(35 * 25250);
    const doc = landscape();
    expect(drawRefinedBatch(doc, orders, { ...options, pages })).toHaveLength(pages.length);
    expect(doc.getNumberOfPages()).toBe(pages.length);
    expect(planInvoicePages(orders, options)).toEqual(plan);
  });
  it('requires saved serials rather than inventing a random official number', () => {
    expect(() => drawRefinedBatch(landscape(), [order], {
      recipient: validateInvoiceGroup([order]), includeNotes: false, issuedAt, lang: 'bm',
    })).toThrow(/Saved invoice/);
  });
  it('rejects duplicate numbers or changed totals', () => {
    const options = {
      lang: 'bm' as const,
      includeNotes: false,
      recipient: validateInvoiceGroup([order]),
      issuedAt,
      pages: [{ invoiceNo: 'RW54000', orderIds: ['one'], totalCents: 1 }],
    };
    expect(() => drawRefinedBatch(landscape(), [order], options)).toThrow(/page plan mismatch/);
    expect(() =>
      drawRefinedBatch(landscape(), [order, { ...order, id: 'two' }], {
        ...options,
        pages: [
          { invoiceNo: 'RW54000', orderIds: ['one'], totalCents: 25250 },
          { invoiceNo: 'RW54000', orderIds: ['two'], totalCents: 25250 },
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

it('keeps eight master columns, extra meals, charges and missing prices', () => {
  const options={recipient:validateInvoiceGroup([order]),includeNotes:false,lang:'en' as const,issuedAt};
  const data=refinedBatchLayout(landscape(),[{...order,meals:['breakfast','lunch','tea_break','hi_tea','dinner'],prices:{breakfast:8,tea_break:5,hi_tea:9,dinner:12},deliveryCharge:5,serviceChargeAmount:2.25,totalAmount:857.25}],options);
  const cells=data.rows[0].lines.map(lines=>lines.join(' '));
  expect(cells).toHaveLength(8);
  expect(cells[4]).toBe('8.00');expect(cells[5]).toBe('-');expect(cells[6]).toBe('-');
  for(const value of ['Tea break: RM 5.00 / pax','Hi-tea: RM 9.00 / pax','Dinner: RM 12.00 / pax','Delivery Charge: RM 5.00','Service Charge: RM 2.25'])expect(cells[3]).toContain(value);
  expect(cells[7]).toBe('857.25');
});
