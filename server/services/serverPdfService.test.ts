import { describe, it, expect } from 'vitest';
import {
  generateServerInvoicePdf,
  generateServerConsolidatedInvoicePdf,
} from './serverPdfService';

describe('serverPdfService - Integrity & Validation', () => {
  const sampleOrder1 = {
    id: 'server-ord-1',
    to: 'Kementerian Kewangan Malaysia',
    name: 'Puan Halimah',
    invoiceNo: 'RW 00101',
    date: '2026-09-20',
    preparationType: 'buffet',
    quantity: 60,
    menu: 'Set Tradisi Wawasan',
    status: 'approved',
    prices: { lunch: 18.00 },
    meals: ['lunch'],
    dishes: ['Nasi Putih', 'Ayam Goreng Berempah', 'Sayur Campur'],
    pricing: { total: 1080.00 },
  };

  const sampleOrder2 = {
    ...sampleOrder1,
    id: 'server-ord-2',
    date: '2026-09-21',
    quantity: 40,
    pricing: { total: 720.00 },
  };

  it('generates a valid Buffer for an individual invoice', async () => {
    const pdfBuffer = await generateServerInvoicePdf(sampleOrder1, 'bm');
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF Magic bytes: %PDF-
    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('generates a valid Buffer for a consolidated invoice with matching client', async () => {
    const pdfBuffer = await generateServerConsolidatedInvoicePdf(
      [sampleOrder1, sampleOrder2],
      'RW 99999',
      false,
      'bm'
    );
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('enforces single client boundary on server consolidated invoice', async () => {
    const differentClientOrder = {
      ...sampleOrder2,
      id: 'server-ord-3',
      to: 'Jabatan Perkhidmatan Awam',
    };

    await expect(
      generateServerConsolidatedInvoicePdf(
        [sampleOrder1, differentClientOrder],
        'RW 99998',
        false,
        'bm'
      )
    ).rejects.toThrow(/SATU syarikat\/klien sahaja/);
  });

  it('rejects empty orders array for consolidated invoice', async () => {
    await expect(
      generateServerConsolidatedInvoicePdf([], 'RW 99997', false, 'en')
    ).rejects.toThrow(/No orders selected/);
  });
});
