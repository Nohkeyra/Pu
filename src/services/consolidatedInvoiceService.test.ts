import { describe, it, expect } from 'vitest';
import { generateConsolidatedInvoicePDF } from './consolidatedInvoiceService';
import type { Order } from '@/types';

describe('consolidatedInvoiceService - Invoice Numbering & Integrity', () => {
  const sampleOrder1: Order = {
    id: 'ord-1',
    name: 'Ahmad',
    to: 'Gas District Cooling Putrajaya Sdn Bhd',
    attn: 'En. Razak',
    contact: '0123456789',
    email: 'razak@gdc.com.my',
    date: '2026-09-15',
    time: '12:30 PM',
    pax: 50,
    meal: 'lunch',
    meals: ['lunch'],
    dishes: ['Nasi Beriani', 'Ayam Masak Merah', 'Dalcha'],
    status: 'approved',
    createdAt: new Date().toISOString(),
    items: [
      { name: 'Nasi Beriani Set', quantity: 50, price: 15.00, subtotal: 750.00 }
    ],
    pricing: {
      subtotal: 750.00,
      total: 750.00,
      perPax: 15.00,
      deliveryFee: 0,
      sst: 0,
      discount: 0
    }
  };

  const sampleOrder2: Order = {
    ...sampleOrder1,
    id: 'ord-2',
    date: '2026-09-16',
    items: [
      { name: 'Nasi Hujan Panas Set', quantity: 40, price: 15.00, subtotal: 600.00 }
    ],
    pricing: {
      subtotal: 600.00,
      total: 600.00,
      perPax: 15.00,
      deliveryFee: 0,
      sst: 0,
      discount: 0
    }
  };

  it('generates consolidated PDF with provided custom invoice number', () => {
    const customNo = 'RW 00088';
    const doc = generateConsolidatedInvoicePDF({
      orders: [sampleOrder1, sampleOrder2],
      includeNotes: false,
      invoiceNo: customNo,
      lang: 'bm'
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2); // content + summary page
  });

  it('generates valid PDF when no invoice number is provided (auto-fallback)', () => {
    const doc = generateConsolidatedInvoicePDF({
      orders: [sampleOrder1],
      includeNotes: true,
      lang: 'en'
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(2); // 1 content page + 1 summary page
  });

  it('throws descriptive error if orders belong to multiple distinct clients', () => {
    const multiClientOrder: Order = {
      ...sampleOrder2,
      id: 'ord-3',
      to: 'Jabatan Perdana Menteri'
    };

    expect(() => {
      generateConsolidatedInvoicePDF({
        orders: [sampleOrder1, multiClientOrder],
        includeNotes: false,
        invoiceNo: 'RW 00099',
        lang: 'bm'
      });
    }).toThrow(/SATU syarikat\/klien sahaja/);
  });
});
