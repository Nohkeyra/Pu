import { describe, it, expect, vi, afterEach } from 'vitest';
import { PDFArray, PDFDocument, PDFHexString, PDFRawStream, PDFString, decodePDFRawStream } from 'pdf-lib';
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

// Inspect only page content streams, not image bytes, xref tables or font data.
// pdf-lib emits hex text operands; jsPDF/ReportLab can emit literal strings.
async function inspectPdf(bytes: Buffer) {
  const document = await PDFDocument.load(bytes);
  const streams = document.getPages().map((page) => {
    const contents = page.node.Contents();
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    return refs.map((ref) => {
      const stream = document.context.lookup(ref);
      if (!(stream instanceof PDFRawStream)) throw new Error('Expected PDF page content stream');
      return Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
    }).join('\n');
  });
  const pageTexts = streams.map((stream) => {
    const text: string[] = [];
    const operands = /(<[0-9a-fA-F\s]+>|\((?:\\[\s\S]|[^\\()])*\))\s*Tj\b|\[((?:[^\]\\]|\\[\s\S])*)\]\s*TJ\b/g;
    const decode = (token: string) => token.startsWith('<')
      ? PDFHexString.of(token.slice(1, -1).replace(/\s/g, '')).decodeText()
      : PDFString.of(token.slice(1, -1)).decodeText();
    for (const match of stream.matchAll(operands)) {
      if (match[1]) text.push(decode(match[1]));
      else {
        const tokens = match[2].match(/<[0-9a-fA-F\s]+>|\((?:\\[\s\S]|[^\\()])*\)/g) || [];
        text.push(tokens.map(decode).join(''));
      }
    }
    return text;
  });
  return { pageTexts, streams, text: pageTexts.flat().join('\n'), pageCount: document.getPageCount() };
}

async function readablePdfStreams(bytes: Buffer): Promise<string> {
  return (await inspectPdf(bytes)).text;
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
    invoiceNo: 'RW00012',
    status: 'billed',
  };
  const single = await readablePdfStreams(await generateServerInvoicePdf(order, true));
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
  const batch = await readablePdfStreams(
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
    expect(text).not.toContain('KLCC');
    expect(text).not.toContain('RG-420614');
  }
  expect(single).toContain('This is a computer-generated invoice. No company stamp is required.');
  expect(single).toContain('RW00012');
  expect(batch).toContain('biodegradable');
  expect(batch).toContain('tiada cop syarikat');
});

it('renders bilingual Master PDF invoices, quotations, receipts, and PETRONAS company code subject safely', async () => {
  const petronasOrder = {
    to: 'PETROLIAM NASIONAL BERHAD (PETRONAS)',
    companyCode: '9999', // stale code must be ignored/verified against legal entity name
    department: 'Bahagian Perolehan',
    billingAddress: 'Menara 1, Menara Berkembar PETRONAS, Pusat Bandaraya Kuala Lumpur, 50088 Kuala Lumpur',
    attn: 'Puan Aisyah',
    invoiceNo: 'RW00001',
    quoteNo: 'QT-20261109-01',
    date: '2026-11-09',
    location: 'Dewan Persidangan Aras 12, Bangunan Utama Kerajaan Persekutuan Presint 2 Putrajaya',
    quantity: 30,
    meals: ['breakfast', 'lunch'],
    prices: { breakfast: 10, lunch: 18 },
    totalAmount: 840,
    status: 'billed',
    lang: 'en',
  };

  const invoiceBytes = await generateServerInvoicePdf(petronasOrder, true, 'invoice');
  const invoiceText = await readablePdfStreams(invoiceBytes);
  expect(invoiceText).toContain('INVOICE');
  expect(invoiceText).toContain('RW00001');
  expect(invoiceText).toContain('0001');
  expect(invoiceText).not.toContain('9999');
  expect(invoiceText).toContain('Page 1 / 1');
  expect(invoiceText).toContain('This is a computer-generated invoice. No company stamp is required.');

  const quoteBytes = await generateServerInvoicePdf(
    { ...petronasOrder, status: 'pending', lang: 'bm' },
    false,
    'quotation'
  );
  const quoteText = await readablePdfStreams(quoteBytes);
  expect(quoteText).toContain('SEBUT HARGA');
  expect(quoteText).toContain('QT-20261109-01');
  expect(quoteText).toContain('Ini adalah sebut harga janaan komputer. Tiada cop syarikat diperlukan.');

  const receiptBytes = await generateServerInvoicePdf(
    { ...petronasOrder, status: 'completed', lang: 'en' },
    true,
    'receipt'
  );
  const receiptText = await readablePdfStreams(receiptBytes);
  expect(receiptText).toContain('RECEIPT');
  expect(receiptText).toContain('COMPLETED');
  expect(receiptText).toContain('official catering receipt from Restoran Wawasan');

  // Non-PETRONAS must fall back to '-' even if stale companyCode exists
  const nonPetronasBytes = await generateServerInvoicePdf(
    {
      ...petronasOrder,
      to: 'Putrajaya Holdings Sdn Bhd',
      company: 'Putrajaya Holdings Sdn Bhd',
      companyCode: '0001',
    },
    true,
    'invoice'
  );
  const nonPetronasText = (await inspectPdf(nonPetronasBytes)).pageTexts.flat();
  expect(nonPetronasText).toContain('-');
  expect(nonPetronasText).not.toContain('0001');
});

it('paginates long multi-row menus cleanly and keeps signature only on the final page', async () => {
  const order = {
    to: 'Agensi Contoh',
    invoiceNo: 'RW00099',
    date: '2026-11-09',
    name: 'Encik Faris',
    contact: '0173157721',
    email: 'faris@example.com',
    location: 'Dewan Mesyuarat Utama',
    quantity: 50,
    meals: ['breakfast', 'tea_break', 'lunch', 'hi_tea'],
    prices: { breakfast: 10, tea_break: 8, lunch: 20, hi_tea: 12 },
    menu: Array.from({ length: 18 }, (_, i) => `Hidangan Istimewa Nombor ${i + 1} dengan Sambal Tradisional`).join(', '),
    totalAmount: 2500,
    lang: 'bm',
  };
  const bytes = await generateServerInvoicePdf(order, true);
  const decoded = await inspectPdf(bytes);
  expect(decoded.pageCount).toBeGreaterThanOrEqual(2);
  expect(decoded.text).toContain('Halaman 1 /');
  expect(decoded.text).toContain('Halaman 2 /');
  // Signature XObject must be drawn exactly once, only on the final page.
  expect(decoded.streams.map((stream) => (stream.match(/\/fzImg0\s+Do\b/g) || []).length))
    .toEqual(decoded.streams.map((_, index) => index === decoded.pageCount - 1 ? 1 : 0));
});

it('itemises both charges separately in the official single invoice', async () => {
  const order = {
    to: 'Contoh',
    invoiceNo: 'RW00225',
    name: 'Contoh',
    eventDate: '2026-11-26',
    quantity: 20,
    meals: ['lunch'],
    prices: { lunch: 10 },
    deliveryCharge: 5,
    serviceChargeRate: 10,
    serviceChargeAmount: 20,
    totalAmount: 225,
    lang: 'en',
    location: 'Putrajaya',
  };
  const content = await readablePdfStreams(await generateServerInvoicePdf(order, true));
  expect(content).toContain('Delivery Charge');
  expect(content).toContain('Service Charge');
  expect(content).toContain('225.00');
});
