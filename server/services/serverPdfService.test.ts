import { describe, it, expect, vi, afterEach } from 'vitest';
import { inflateSync } from 'node:zlib';
import { planInvoicePages } from '../../src/services/invoiceBatchPdf';
import { INVOICE_BUSINESS } from '../../src/constants/invoiceBusiness';
import {
  getBankDetails,
  generateSavedInvoicePdf,
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
    prices: { lunch: 18.0 },
    meals: ['lunch'],
    dishes: ['Nasi Putih', 'Ayam Goreng Berempah', 'Sayur Campur'],
    pricing: { total: 1080.0 },
  };

  const sampleOrder2 = {
    ...sampleOrder1,
    id: 'server-ord-2',
    date: '2026-09-21',
    quantity: 40,
    pricing: { total: 720.0 },
  };

  it('generates a valid Buffer for an individual invoice', async () => {
    const pdfBuffer = await generateServerInvoicePdf(sampleOrder1, true);
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

  it('generates a valid Buffer for a multi-client server consolidated invoice', async () => {
    const differentClientOrder = {
      ...sampleOrder2,
      id: 'server-ord-3',
      to: 'Jabatan Perkhidmatan Awam',
    };

    const pdfBuffer = await generateServerConsolidatedInvoicePdf(
      [sampleOrder1, differentClientOrder],
      'RW 99998',
      false,
      'bm'
    );
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('rejects empty orders array for consolidated invoice', async () => {
    await expect(generateServerConsolidatedInvoicePdf([], 'RW 99997', false, 'en')).rejects.toThrow(
      /No orders selected/
    );
  });
});

function readablePdfStreams(bytes: Buffer): string {
  const raw = bytes.toString('latin1');
  let decoded = raw;
  let cursor = 0;
  while ((cursor = raw.indexOf('stream\n', cursor)) !== -1) {
    const start = cursor + 7,
      end = raw.indexOf('\nendstream', start);
    if (end < 0) break;
    try {
      decoded += '\n' + inflateSync(bytes.subarray(start, end)).toString('latin1');
    } catch {
      /* Non-Flate image streams are not text. */
    }
    cursor = end + 10;
  }
  return decoded;
}
afterEach(() => vi.unstubAllEnvs());
it('uses the confirmed bank details when configuration is absent or blank, while respecting configured values', () => {
  for (const key of [
    'BANK_NAME',
    'BANK_ACCOUNT_NAME',
    'BANK_ACCOUNT_NUMBER',
    'VITE_BANK_NAME',
    'VITE_BANK_ACCOUNT_NAME',
    'VITE_BANK_ACCOUNT_NUMBER',
  ])
    vi.stubEnv(key, '');
  expect(getBankDetails()).toEqual(INVOICE_BUSINESS.bank);
  vi.stubEnv('BANK_ACCOUNT_NUMBER', '   ');
  expect(getBankDetails().bankAccountNumber).toBe('16010000-405710');
  vi.stubEnv('BANK_ACCOUNT_NUMBER', '  TEST-OVERRIDE  ');
  expect(getBankDetails().bankAccountNumber).toBe('TEST-OVERRIDE');
});
it('prints the account number, full address and standard notes in both invoice formats', async () => {
  for (const key of [
    'BANK_NAME',
    'BANK_ACCOUNT_NAME',
    'BANK_ACCOUNT_NUMBER',
    'VITE_BANK_NAME',
    'VITE_BANK_ACCOUNT_NAME',
    'VITE_BANK_ACCOUNT_NUMBER',
  ])
    vi.stubEnv(key, '');
  const order = {
    id: 'bank_order',
    to: 'Contoh sahaja',
    name: 'Contoh',
    email: 'contoh@example.com',
    billingAddress: 'Alamat contoh',
    date: '2026-11-09',
    quantity: 10,
    meals: ['lunch'],
    prices: { lunch: 10 },
    totalAmount: 100,
    invoiceNo: 'RW BANK-TEST',
    status: 'billed',
  };
  const single = readablePdfStreams(await generateServerInvoicePdf(order, true));
  const recipient = { company: order.to, address: order.billingAddress, email: order.email },
    options = {
      recipient,
      includeNotes: false,
      lang: 'bm' as const,
      issuedAt: '2026-11-09T04:00:00Z',
    };
  const pages = planInvoicePages([order], options).map((page) => ({
    ...page,
    invoiceNo: 'RW BANK-TEST',
  }));
  const batch = readablePdfStreams(
    await generateSavedInvoicePdf({
      invoiceNo: 'RW BANK-TEST',
      orders: [order],
      pages,
      ...options,
      layoutVersion: 2,
    })
  );
  for (const text of [single, batch]) {
    expect(text).toContain('16010000-405710');
    expect(text).toContain('BANK MUAMALAT');
    expect(text).toContain('RESTORAN WAWASAN');
    expect(text).toContain('Jalan P2a');
    expect(text).toContain('biodegradable');
    expect(text).toContain('tiada cop syarikat');
    expect(text).not.toContain('KLCC');
    expect(text).not.toContain('RG-420614');
  }
});

it('keeps invoice details on page one and moves contact information to an unnumbered appendix', async () => {
  const order = {
    to: 'Agensi Contoh',
    invoiceNo: 'RW LAYOUT-01',
    date: '2026-11-09',
    name: 'USER PEMBUAT PESANAN',
    attn: 'PEGAWAI BIL SYARIKAT',
    picName: 'PEGAWAI HALAMAN DUA',
    contact: '0173157721',
    email: 'pegawai@example.com',
    notes: 'Catatan halaman kedua sahaja',
    location: 'Dewan Mesyuarat',
    quantity: 25,
    meals: ['lunch'],
    prices: { lunch: 10 },
    totalAmount: 250,
  };
  const bytes = await generateServerInvoicePdf(order, true),
    raw = bytes.toString('latin1');
  const streams = [...raw.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((match) => match[1]);
  expect(raw.match(/\/Type \/Page\b/g)).toHaveLength(2);
  expect(streams[0]).toContain('No. Invois: RW LAYOUT-01');
  expect(streams[0]).not.toContain('(NO. INVOIS)');
  expect(streams[0]).toContain('PEGAWAI BIL SYARIKAT');
  expect(streams[0]).not.toContain('USER PEMBUAT PESANAN');
  expect(streams[0]).not.toContain('Catatan halaman kedua sahaja');
  expect(streams[0].indexOf('biodegradable')).toBeGreaterThan(
    streams[0].indexOf('16010000-405710')
  );
  expect(streams[1]).toContain('USER PEMBUAT PESANAN');
  expect(streams[1]).not.toContain('PEGAWAI HALAMAN DUA');
  expect(streams[1]).not.toContain('PEGAWAI BIL SYARIKAT');
  expect(streams[1]).toContain('pegawai@example.com');
  expect(streams[1]).toContain('Catatan halaman kedua sahaja');
  expect(streams[1]).not.toContain('RW LAYOUT-01');
  expect(streams[1]).not.toContain('JUMLAH KESELURUHAN');
});
