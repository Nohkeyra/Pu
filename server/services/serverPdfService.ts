import { INVOICE_BUSINESS } from '../../src/constants/invoiceBusiness.js';
/**
 * serverPdfService.ts
 *
 * Server-side equivalent of src/services/pdfService.ts.
 * Runs in Node.js (Express/Render) — no browser DOM, no canvas, no Vite env.
 *
 * Key differences from the browser version:
 *  - Images loaded via fs.readFileSync() instead of new Image() + canvas
 *  - process.env instead of import.meta.env for bank details
 *  - Returns Buffer (for nodemailer attachment) instead of jsPDF output string
 *  - getBilingualWordsInTotal() inlined (can't import from src/ in server build)
 *
 * Design output is intentionally identical to generateInvoicePDF() in the app.
 */

import path from 'path';
import fs from 'fs';
import { jsPDF } from 'jspdf';
import {
  drawInvoiceCalligraphy,
  drawInvoiceContactLinks,
  INVOICE_CONTACT,
} from '../../src/services/invoicePdfBrand.js';
import { renderInvoiceBatch } from '../../src/services/invoiceBatchPdf.js';
import type { InvoiceBatch } from '../../src/lib/invoiceBatch.js';

// ─── Bank details (env vars, same names as on Render dashboard) ──────────────
export function getBankDetails() {
  const setting = (name: string, fallback: string) =>
    (process.env[name] || '').trim() || (process.env[`VITE_${name}`] || '').trim() || fallback;
  return {
    bankName: setting('BANK_NAME', INVOICE_BUSINESS.bank.bankName),
    bankAccountName: setting('BANK_ACCOUNT_NAME', INVOICE_BUSINESS.bank.bankAccountName),
    bankAccountNumber: setting('BANK_ACCOUNT_NUMBER', INVOICE_BUSINESS.bank.bankAccountNumber),
  };
}

// ─── Image loading ────────────────────────────────────────────────────────────
// After `npm run build` (vite build, copyPublicDir: true), public/ contents land
// in dist/ (not dist/public/). So `public/assets/brand/logo.png` → `dist/assets/brand/logo.png`.
function loadImageBase64(relativePaths: string[]): string | null {
  const cwd = process.cwd();
  // Try dist/ first (production), then public/ (dev/local), then fall through.
  const bases = [
    path.join(cwd, 'dist'),
    path.join(cwd, 'public'),
    cwd,
    path.join(__dirname, '..', 'public'),
    path.join(__dirname, '..', 'dist'),
    path.join(__dirname, 'public'),
    path.join(__dirname, 'dist'),
    __dirname,
  ];
  for (const relPath of relativePaths) {
    for (const base of bases) {
      const full = path.join(base, relPath);
      try {
        if (fs.existsSync(full)) {
          return fs.readFileSync(full).toString('base64');
        }
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

// Cache loaded images in module scope (persists for lifetime of the Node process,
// which is what we want — no need to re-read from disk on every invoice).
let cachedLogoBase64: string | null = null;
let cachedJawiBase64: string | null = null;
let imagesLoaded = false;

function ensureImagesLoaded() {
  if (!cachedLogoBase64) {
    cachedLogoBase64 = loadImageBase64([
      'assets/brand/apk_logo_clean.png',
      'assets/brand/wawasan_logo.png',
      'assets/brand/wawasan_logo_fallback.png',
    ]);
  }
  if (!cachedJawiBase64) {
    cachedJawiBase64 = loadImageBase64([
      'assets/heritage/Jawi.jpg',
      'assets/heritage/batik_pattern.jpg',
      'assets/heritage/batik_pattern_hd.jpg',
      'assets/heritage/batik_vector_pattern.jpg',
    ]);
  }
  if (!imagesLoaded) {
    if (!cachedLogoBase64)
      console.warn('[serverPdfService] Logo image not found — PDF will render without logo.');
    if (!cachedJawiBase64)
      console.warn(
        '[serverPdfService] Jawi image not found — PDF will render with clean header background.'
      );
    imagesLoaded = true;
  }
}

// ─── Amount-in-words (inlined from src/services/numberToWordsBM.ts) ───────────
function bmWords(num: number): string {
  if (num === 0) return 'Kosong';
  const units = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Lapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
    'Dua Belas',
    'Tiga Belas',
    'Empat Belas',
    'Lima Belas',
    'Enam Belas',
    'Tujuh Belas',
    'Lapan Belas',
    'Sembilan Belas',
  ];
  const tens = [
    '',
    '',
    'Dua Puluh',
    'Tiga Puluh',
    'Empat Puluh',
    'Lima Puluh',
    'Enam Puluh',
    'Tujuh Puluh',
    'Lapan Puluh',
    'Sembilan Puluh',
  ];
  const lt1000 = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
    const h = Math.floor(n / 100),
      r = n % 100;
    return (h === 1 ? 'Seratus' : units[h] + ' Ratus') + (r ? ' ' + lt1000(r) : '');
  };
  const whole = (n: number): string => {
    if (n === 0) return 'Kosong';
    let res = '',
      si = 0;
    while (n > 0) {
      const c = n % 1000;
      if (c !== 0) {
        const cw = lt1000(c);
        if (si === 0) res = cw;
        else if (si === 1) res = (c === 1 ? 'Seribu' : cw + ' Ribu') + (res ? ' ' + res : '');
        else if (si === 2) res = (c === 1 ? 'Sejuta' : cw + ' Juta') + (res ? ' ' + res : '');
        else res = cw + (res ? ' ' + res : '');
      }
      n = Math.floor(n / 1000);
      si++;
    }
    return res;
  };
  // Split on whole cents (not a floating-point subtraction) so binary
  // float drift in `num` (e.g. an amount built up from several 2dp
  // additions) can never round the cents part up to 100 and silently
  // drop a ringgit — see the matching fix in src/services/numberToWordsBM.ts.
  const totalCents = Math.round(num * 100);
  const ip = Math.floor(totalCents / 100),
    dp = totalCents % 100;
  return whole(ip) + (dp > 0 ? ' dan ' + whole(dp) + ' Sen' : '');
}

function enWords(num: number): string {
  if (num === 0) return 'Zero';
  const units = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const lt1000 = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + units[n % 10] : '');
    const h = Math.floor(n / 100),
      r = n % 100;
    return units[h] + ' Hundred' + (r ? ' ' + lt1000(r) : '');
  };
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  const whole = (n: number): string => {
    if (n === 0) return 'Zero';
    let res = '',
      si = 0;
    while (n > 0) {
      const c = n % 1000;
      if (c !== 0) res = lt1000(c) + (si > 0 ? ' ' + scales[si] : '') + (res ? ' ' + res : '');
      n = Math.floor(n / 1000);
      si++;
    }
    return res;
  };
  // See the matching comment in bmWords() above.
  const totalCents = Math.round(num * 100);
  const ip = Math.floor(totalCents / 100),
    dp = totalCents % 100;
  return whole(ip) + (dp > 0 ? ' and ' + whole(dp) + ' Sen' : '');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Mirrors src/lib/dateUtils.ts formatDateDisplay() — kept as its own small
// copy here since server/ can't import from src/lib (client-only aliasing),
// same pattern already used by src/services/orderCalculation.js being
// imported the other way (server importing from src/services is fine;
// src/lib/dateUtils.ts imports browser-safe code but duplicating this one
// tiny function avoids any risk of pulling in client-only deps by accident).
// Format: DD/MM/YYYY — matches every other date shown in the app since the
// formatDateSafe → formatDateDisplay migration in pdfService.ts.
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const trimmed = dateStr.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  } catch {
    return trimmed;
  }
}

const mealLabels: Record<string, string> = {
  breakfast: 'Sarapan / Breakfast',
  lunch: 'Makan Tengahari / Lunch',
  hi_tea: 'Hi-Tea',
  hi_tea_break: 'Hi-Tea',
  tea_break: 'Rehat / Tea Break',
};

// ─── PDF drawing helpers (same coordinates as browser pdfService.ts) ──────────
function drawHeaderBackground(doc: jsPDF, headerHeight = 36, pageWidth = 210) {
  drawInvoiceCalligraphy(doc, cachedJawiBase64, headerHeight, pageWidth);
}
export async function generateSavedInvoicePdf(batch: InvoiceBatch): Promise<Buffer> {
  ensureImagesLoaded();
  return Buffer.from(
    renderInvoiceBatch(batch.orders, {
      ...batch,
      logo: cachedLogoBase64,
      calligraphy: cachedJawiBase64,
      bank: getBankDetails(),
    }).output('arraybuffer')
  );
}

function drawCreamBox(
  doc: jsPDF,
  label: string,
  content: string | string[],
  x: number,
  y: number,
  w: number,
  h: number,
  isBoldContent = false
) {
  doc.setFillColor(250, 248, 244);
  doc.setDrawColor(220, 210, 195);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 100, 80);
  doc.text(label, x + 4, y + 4.8);
  doc.setFont('helvetica', isBoldContent ? 'bold' : 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 35, 30);
  const lines = Array.isArray(content) ? content : [content];
  lines.forEach((line, idx) => {
    doc.text(line, x + 4, y + 9.8 + idx * 4.2);
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * Generates a full PDF invoice (same design as the browser app) and returns
 * the raw bytes as a Buffer, ready for nodemailer attachment.
 *
 * @param order  Firestore order document (merged with invoiceNo, prices, totalAmount)
 * @param isFinal  true = show final price; false = preliminary/pending quote layout
 */
function drawInvoiceBox(
  doc: jsPDF,
  label: string,
  content: string | string[],
  x: number,
  y: number,
  w: number,
  h: number,
  isBoldContent = true
) {
  doc.setFillColor(253, 252, 250); // Clean warm ivory (#FDFCFA)
  doc.setDrawColor(194, 147, 45); // Gold border (#C2932D)
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(166, 124, 30); // Gold text (#A67C1E)
  doc.text(label, x + 4, y + 4.8);

  doc.setFont('helvetica', isBoldContent ? 'bold' : 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 24, 22); // Charcoal text (#1A1816)
  const lines = Array.isArray(content) ? content : [content];
  lines.forEach((line, idx) => {
    doc.text(line, x + 4, y + 9.8 + idx * 4.2);
  });
}

export async function generateServerInvoicePdf(
  order: Record<string, any>,
  isFinal: boolean
): Promise<Buffer> {
  ensureImagesLoaded();

  const lang: 'en' | 'bm' = order.lang === 'en' ? 'en' : 'bm';
  const { bankName, bankAccountName, bankAccountNumber } = getBankDetails();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── PAGE 1: Full invoice with header, metadata boxes, table, totals ───────────
  drawHeaderBackground(doc);

  // Logo (x=15, y=8, w=20, h=20)
  if (cachedLogoBase64) {
    try {
      doc.addImage(cachedLogoBase64, 'PNG', 15, 8, 20, 20);
    } catch {
      /* continue */
    }
  }

  // Restoran details in Gold (#A67C1E / 166, 124, 30) and Charcoal (26, 24, 22)
  doc.setTextColor(166, 124, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RESTORAN WAWASAN', 39, 16);
  doc.setTextColor(26, 24, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(INVOICE_BUSINESS.addressLines[0], 39, 21);
  doc.text(INVOICE_BUSINESS.addressLines[1], 39, 25);
  doc.text(INVOICE_BUSINESS.addressLines[2], 39, 29);

  // Determine document type (Quotation vs Invoice)
  const isQuoteDoc =
    (order.invoiceNo && order.invoiceNo.startsWith('QT')) ||
    (!isFinal && order.status === 'pending');
  const docTitle = isQuoteDoc
    ? lang === 'en'
      ? 'QUOTATION'
      : 'SEBUT HARGA'
    : lang === 'en'
      ? 'INVOICE'
      : 'INVOIS';

  // Title in Gold (#A67C1E / 166, 124, 30)
  doc.setTextColor(166, 124, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(docTitle, 195, 20, { align: 'right' });

  // Invoice/Quotation date (right side)
  doc.setTextColor(26, 24, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const formattedInvoiceDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.text(`${lang === 'en' ? 'Date' : 'Tarikh'}: ${formattedInvoiceDate}`, 195, 27, {
    align: 'right',
  });

  const invoiceNoVal =
    order.invoiceNo || (isFinal ? 'PENDING' : lang === 'en' ? 'QUOTATION' : 'SEBUT HARGA');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    `${isQuoteDoc ? (lang === 'en' ? 'Quotation No.' : 'No. Sebut Harga') : lang === 'en' ? 'Invoice No.' : 'No. Invois'}: ${invoiceNoVal}`,
    195,
    32,
    { align: 'right' }
  );

  // Clear reading order: customer, event date/pax, then location/meal type.
  const boxLines = (value: string, width: number): string[] => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    return doc.splitTextToSize(value, width - 8) as string[];
  };
  const boxHeight = (lines: string[], minimum = 14) => Math.max(minimum, 8 + lines.length * 4.2);
  const recipientName = String(
    order.to || order.name || (lang === 'en' ? 'Valued Customer' : 'Pelanggan Dihormati')
  );
  const recipientLines = boxLines(recipientName, 120);
  const attnLines = boxLines(String(order.attn || '-'), 50);
  const recipientHeight = Math.max(boxHeight(recipientLines), boxHeight(attnLines));
  drawInvoiceBox(
    doc,
    lang === 'en' ? 'TO' : 'KEPADA',
    recipientLines,
    15,
    42,
    120,
    recipientHeight,
    true
  );
  drawInvoiceBox(doc, 'ATTN', attnLines, 145, 42, 50, recipientHeight, true);
  const eventY = 42 + recipientHeight + 4;
  const deliveryDate = formatDate(order.eventDate || order.date);
  const quantity = Number(order.quantity || order.guests || order.pax || 0);
  drawInvoiceBox(
    doc,
    lang === 'en' ? 'EVENT DATE' : 'TARIKH ACARA',
    deliveryDate,
    15,
    eventY,
    85,
    14,
    true
  );
  drawInvoiceBox(
    doc,
    lang === 'en' ? 'QUANTITY' : 'BILANGAN PAX',
    `${quantity} Pax`,
    110,
    eventY,
    85,
    14,
    true
  );
  const locationVal = String(
    order.location ||
      (lang === 'en'
        ? 'Restoran Wawasan (Dine-in / Pickup)'
        : 'Restoran Wawasan (Makan di Restoran / Ambil Sendiri)')
  );
  const meals: string[] = Array.isArray(order.meals) ? order.meals : ['default'];
  const mealsList = meals
    .map((meal) => {
      const raw = mealLabels[meal] || meal;
      return lang === 'en' ? raw.split(' / ')[1] || raw : raw.split(' / ')[0] || raw;
    })
    .join(', ');
  const locationLines = boxLines(locationVal, 85),
    mealLines = boxLines(mealsList, 85);
  const locationY = eventY + 18,
    locationHeight = Math.max(boxHeight(locationLines, 18), boxHeight(mealLines, 18));
  drawInvoiceBox(
    doc,
    lang === 'en' ? 'EVENT LOCATION' : 'LOKASI ACARA',
    locationLines,
    15,
    locationY,
    85,
    locationHeight,
    true
  );
  drawInvoiceBox(
    doc,
    lang === 'en' ? 'MEAL TYPE' : 'JENIS HIDANGAN',
    mealLines,
    110,
    locationY,
    85,
    locationHeight,
    true
  );
  doc.link(15, locationY, 85, locationHeight, {
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationVal)}`,
  });
  const tableStartY = locationY + locationHeight + 5;
  if (tableStartY + meals.length * 10 + 57 > 253)
    throw new Error('Invoice details exceed one page. Shorten the customer or location text.');
  doc.setFillColor(114, 80, 20); // Deep Royal Bronze-Gold (#725014)
  doc.rect(15, tableStartY, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const headerLabels =
    lang === 'bm'
      ? { item: 'Perihal', price: 'Harga / Pax (RM)', total: 'Jumlah (RM)' }
      : { item: 'Description', price: 'Price / Pax (RM)', total: 'Amount (RM)' };
  doc.text(headerLabels.item, 18, tableStartY + 4.8);
  doc.text(headerLabels.price, 137.5, tableStartY + 4.8, { align: 'center' });
  doc.text(headerLabels.total, 192, tableStartY + 4.8, { align: 'right' });

  // Rows (draw up to 4 meals)
  let currentY = tableStartY + 8;
  const prices: Record<string, number> = order.prices || {};
  let grandTotal = 0;

  meals.forEach((meal, idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 253 : 255, isEven ? 252 : 255, isEven ? 250 : 255);
    doc.rect(15, currentY, 180, 10, 'F');
    doc.setDrawColor(226, 220, 210);
    doc.line(15, currentY, 195, currentY);

    // Draw vertical column lines
    doc.line(15, currentY, 15, currentY + 10);
    doc.line(110, currentY, 110, currentY + 10);
    doc.line(165, currentY, 165, currentY + 10);
    doc.line(195, currentY, 195, currentY + 10);

    const mealLabel = mealLabels[meal] || meal;
    const priceVal = prices[meal] ?? prices['default'] ?? 0;
    const subtotal = priceVal * quantity;
    grandTotal += subtotal;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(26, 24, 22);

    const desc = lang === 'bm' ? mealLabel.split(' / ')[0] : mealLabel.split(' / ')[1] || mealLabel;
    doc.text(desc, 18, currentY + 4.8);

    // If there is menu content and it's the first row, draw it
    if (idx === 0 && order.menu) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(95, 85, 75);
      const truncatedMenu =
        order.menu.length > 55 ? order.menu.substring(0, 52) + '...' : order.menu;
      doc.text(truncatedMenu, 18, currentY + 8.2);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(95, 85, 75);
      doc.text(`${quantity} Pax`, 18, currentY + 8.2);
    }

    if (isFinal && priceVal >= 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(26, 24, 22);
      doc.text(priceVal.toFixed(2), 137.5, currentY + 6, { align: 'center' });
      doc.text(subtotal.toFixed(2), 192, currentY + 6, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(7.5);
      doc.setTextColor(166, 124, 30);
      doc.text(
        lang === 'bm' ? 'Menunggu pengesahan' : 'Pending confirmation',
        137.5,
        currentY + 6,
        { align: 'center' }
      );
      doc.text(lang === 'bm' ? 'Sebut harga' : 'Quotation', 192, currentY + 6, { align: 'right' });
    }

    currentY += 10;
  });

  // End vertical line border for rows
  doc.setDrawColor(226, 220, 210);
  doc.line(15, currentY, 195, currentY);

  if (
    isFinal &&
    order.totalAmount != null &&
    Number.isFinite(Number(order.totalAmount)) &&
    Number(order.totalAmount) >= 0
  )
    grandTotal = Math.round(Number(order.totalAmount) * 100) / 100;

  // Grand total row
  doc.setFillColor(114, 80, 20); // Deep Royal Bronze-Gold (#725014)
  doc.rect(15, currentY, 180, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(lang === 'bm' ? 'JUMLAH KESELURUHAN' : 'GRAND TOTAL', 18, currentY + 6.2);

  if (isFinal && grandTotal >= 0) {
    doc.text(`RM ${grandTotal.toFixed(2)}`, 192, currentY + 6.2, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bolditalic');
    doc.text(
      lang === 'bm' ? '(Menunggu sebut harga)' : '(Pending quotation)',
      192,
      currentY + 6.2,
      { align: 'right' }
    );
  }
  currentY += 10;

  // ── Amount in words ──
  const textNoteY = currentY + 5;
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8);
  doc.setTextColor(35, 30, 25);

  if (isFinal && grandTotal >= 0) {
    const spelled =
      lang === 'en'
        ? `Ringgit Malaysia: ${enWords(grandTotal)} only.`
        : `Ringgit Malaysia: ${bmWords(grandTotal)} sahaja.`;
    doc.text(spelled, 15, textNoteY);
  } else {
    const blankSpelling =
      lang === 'en'
        ? 'Ringgit Malaysia: ____________________________________________________________________ only.'
        : 'Ringgit Malaysia: ____________________________________________________________________ sahaja.';
    doc.text(blankSpelling, 15, textNoteY);
  }

  // The pricing note belongs in the footer as plain text.
  const bankBoxY = textNoteY + 9;
  doc.setFillColor(253, 252, 250); // Clean warm ivory (#FDFCFA)
  doc.setDrawColor(194, 147, 45); // Gold border (#C2932D)
  doc.setLineWidth(0.3);
  doc.roundedRect(15, bankBoxY, 180, 24, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(166, 124, 30); // Gold header (#A67C1E)
  doc.text(lang === 'en' ? 'BANK ACCOUNT DETAILS' : 'MAKLUMAT AKAUN BANK', 20, bankBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(105, 95, 85);
  doc.text(lang === 'en' ? 'Account Name' : 'Nama Akaun', 20, bankBoxY + 11);
  doc.text(lang === 'en' ? 'Bank' : 'Bank', 80, bankBoxY + 11);
  doc.text(lang === 'en' ? 'Account No.' : 'No. Akaun', 140, bankBoxY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 24, 22);
  doc.text(bankAccountName, 20, bankBoxY + 16);
  doc.text(bankName, 80, bankBoxY + 16);
  doc.text(bankAccountNumber, 140, bankBoxY + 16);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(105, 95, 85);
  doc.text(
    lang === 'en'
      ? '* Please quote Invoice No. as payment reference.'
      : '* Sila nyatakan No. Invois sebagai rujukan pembayaran.',
    20,
    bankBoxY + 21
  );

  const drawPortraitFooter = (pageNumber: number, totalPages: number, showPricingNote: boolean) => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(105, 95, 85);
    if (showPricingNote)
      doc.text(INVOICE_BUSINESS.pricingNote[lang], 105, 266, { align: 'center' });
    doc.setFontSize(7);
    doc.text(
      `${lang === 'bm' ? 'Disediakan oleh' : 'Prepared by'}: Restoran Wawasan | ${INVOICE_BUSINESS.generatedNote[lang]}`,
      105,
      272,
      { align: 'center' }
    );
    drawInvoiceContactLinks(doc, 277);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(135, 125, 115);
    doc.text(INVOICE_BUSINESS.address, 15, 285);
    doc.link(15, 281, 160, 6, { url: INVOICE_CONTACT.maps });
    doc.text(`${lang === 'bm' ? 'Halaman' : 'Page'} ${pageNumber} / ${totalPages}`, 195, 285, {
      align: 'right',
    });
  };
  drawPortraitFooter(1, 2, true);

  // Page 2 is a contact appendix; it deliberately has no invoice number or amount.
  doc.addPage();
  drawHeaderBackground(doc);
  if (cachedLogoBase64) doc.addImage(cachedLogoBase64, 'PNG', 15, 8, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(166, 124, 30);
  doc.text('RESTORAN WAWASAN', 39, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 24, 22);
  INVOICE_BUSINESS.addressLines.forEach((line, index) => doc.text(line, 39, 21 + index * 4));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(166, 124, 30);
  doc.text(lang === 'bm' ? 'LAMPIRAN' : 'APPENDIX', 195, 20, { align: 'right' });
  doc.setFillColor(114, 80, 20);
  doc.rect(15, 42, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text(lang === 'bm' ? 'MAKLUMAT PEMBUAT PESANAN (PIC)' : 'ORDERED BY (PIC)', 19, 47.2);
  const picName = String(
    order.name || order.customerName || order.picName || order.pocName || order.contactName || '-'
  );
  const picPhone = String(
    order.contact || order.phone || order.picPhone || order.pocPhone || order.contactNumber || '-'
  );
  const picEmail = String(
    order.email || order.customerEmail || order.picEmail || order.pocEmail || '-'
  );
  const picDept = String(order.department || order.division || '-');
  const pair = (
    y: number,
    leftLabel: string,
    leftValue: string,
    rightLabel: string,
    rightValue: string
  ) => {
    const left = boxLines(leftValue, 85),
      right = boxLines(rightValue, 85),
      height = Math.max(boxHeight(left), boxHeight(right));
    drawInvoiceBox(doc, leftLabel, left, 15, y, 85, height, true);
    drawInvoiceBox(doc, rightLabel, right, 110, y, 85, height, true);
    return y + height + 4;
  };
  let appendixY = pair(
    56,
    lang === 'bm' ? 'NAMA' : 'NAME',
    picName,
    lang === 'bm' ? 'NO. TELEFON' : 'CONTACT NUMBER',
    picPhone
  );
  if (picPhone !== '-')
    doc.link(110, 56, 85, appendixY - 60, {
      url: `https://wa.me/${picPhone.replace(/\D/g, '').replace(/^0/, '60')}`,
    });
  const departmentLines = boxLines(picDept, 180),
    departmentHeight = boxHeight(departmentLines);
  drawInvoiceBox(
    doc,
    lang === 'bm' ? 'JABATAN' : 'DEPARTMENT',
    departmentLines,
    15,
    appendixY,
    180,
    departmentHeight,
    true
  );
  appendixY += departmentHeight + 4;
  const emailLines = boxLines(picEmail, 180),
    emailHeight = boxHeight(emailLines);
  drawInvoiceBox(
    doc,
    lang === 'bm' ? 'E-MEL' : 'EMAIL',
    emailLines,
    15,
    appendixY,
    180,
    emailHeight,
    true
  );
  if (picEmail !== '-')
    doc.link(15, appendixY, 180, emailHeight, { url: `mailto:${encodeURIComponent(picEmail)}` });
  appendixY += emailHeight + 4;
  const notes = boxLines(String(order.notes || order.specialNotes || '-'), 180),
    notesHeight = boxHeight(notes, 35);
  if (appendixY + notesHeight > 258)
    throw new Error('Contact notes exceed the appendix page. Shorten the notes before exporting.');
  drawInvoiceBox(
    doc,
    lang === 'bm' ? 'CATATAN' : 'NOTES',
    notes,
    15,
    appendixY,
    180,
    notesHeight,
    false
  );
  drawPortraitFooter(2, 2, false);

  // ── Return as Buffer ──
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export async function generateServerConsolidatedInvoicePdf(
  orders: Record<string, any>[],
  invoiceNo?: string,
  includeNotes: boolean = false,
  lang: 'bm' | 'en' = 'bm'
): Promise<Buffer> {
  if (!orders || orders.length === 0) {
    throw new Error(
      lang === 'bm'
        ? 'Tiada pesanan dipilih untuk invois konsolidasi.'
        : 'No orders selected for consolidated invoice.'
    );
  }

  ensureImagesLoaded();

  // Consolidated invoices MUST be landscape A4 (297mm x 210mm)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const cCreamBg = [253, 252, 250]; // Clean warm ivory (#FDFCFA)
  const cGoldBorder = [194, 147, 45]; // Gold border (#C2932D)
  const cHeaderGold = [166, 124, 30]; // Royal Gold (#A67C1E)
  const cDeepGold = [114, 80, 20]; // Deep Royal Bronze-Gold (#725014)
  const cCharcoal = [26, 24, 22]; // Warm charcoal (#1A1816)

  const drawPageHeader = (pageNumber: number) => {
    drawHeaderBackground(doc, 36, 297);

    if (cachedLogoBase64) {
      try {
        doc.addImage(cachedLogoBase64, 'PNG', 15, 8, 20, 20);
      } catch {
        /* continue */
      }
    }

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('RESTORAN WAWASAN', 39, 16);

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      'Unit 3, Level B3, Menara PjH, Jalan P2a, Presint 2, 62100 Putrajaya, W.P Putrajaya',
      39,
      23
    );

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(lang === 'en' ? 'CONSOLIDATED INVOICE' : 'INVOIS KONSOLIDASI', 282, 20, {
      align: 'right',
    });

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      `${lang === 'en' ? 'Invoice No' : 'No. Invois'}: ${invoiceNo || 'COMBINED'}`,
      282,
      26,
      { align: 'right' }
    );
    doc.text(
      `${lang === 'en' ? 'Date' : 'Tarikh'}: ${formatDate(new Date().toISOString())}`,
      282,
      30,
      { align: 'right' }
    );
    if (pageNumber > 1) {
      doc.text(`${lang === 'en' ? 'Page' : 'Muka Surat'} ${pageNumber}`, 282, 34, {
        align: 'right',
      });
    }
  };

  let pageNumber = 1;
  drawPageHeader(pageNumber);

  const distinctClients = new Set(orders.map((o) => o.to || '-'));
  const clientName =
    distinctClients.size > 1 ? Array.from(distinctClients).join(', ') : orders[0]?.to || '-';
  const recipientText = clientName;
  drawCreamBox(doc, lang === 'en' ? 'TO' : 'KEPADA', recipientText, 15, 40, 267, 13, true);

  const allPossibleMeals = ['breakfast', 'lunch', 'tea_break', 'hi_tea', 'dinner'];
  const activeMeals = allPossibleMeals.filter((m) =>
    orders.some((o) => Array.isArray(o.meals) && o.meals.includes(m))
  );

  const startX = 15;
  const colDate = 26;
  const colQty = 16;
  const colNotes = includeNotes ? 38 : 0;
  const mealColWidth = 24;
  const colMealsWidth = Math.max(activeMeals.length * mealColWidth, 48);
  const colRM = 25;
  const colMenu = 267 - colDate - colQty - colNotes - colMealsWidth - colRM;

  const xDate = startX;
  const xQty = xDate + colDate;
  const xNotes = xQty + colQty;
  const xMenu = includeNotes ? xNotes + colNotes : xNotes;
  const xMealsStart = xMenu + colMenu;
  const xRM = xMealsStart + colMealsWidth;

  const drawMatrixHeader = (y: number) => {
    // Row 1: ORDER DETAILS, PRICE / PAX (RM), TOTAL
    doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.rect(15, y, 267, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text(
      lang === 'en' ? 'ORDER DETAILS' : 'BUTIRAN PESANAN',
      xDate + (xMealsStart - xDate) / 2,
      y + 4.8,
      { align: 'center' }
    );

    if (activeMeals.length > 0) {
      doc.line(xMealsStart, y, xMealsStart, y + 7);
      doc.text(
        lang === 'en' ? 'PRICE / PAX (RM)' : 'HARGA / PAX (RM)',
        xMealsStart + colMealsWidth / 2,
        y + 4.8,
        { align: 'center' }
      );
    }

    doc.line(xRM, y, xRM, y + 7);
    doc.text(lang === 'en' ? 'TOTAL' : 'JUMLAH', xRM + colRM / 2, y + 4.8, { align: 'center' });

    // Row 2: Sub-columns
    const r2Y = y + 7;
    doc.setFillColor(cDeepGold[0], cDeepGold[1], cDeepGold[2]);
    doc.rect(15, r2Y, 267, 7, 'F');

    doc.setFontSize(7.5);
    const centerText = (txt: string, x: number, w: number) => {
      doc.text(txt, x + w / 2, r2Y + 4.8, { align: 'center' });
    };

    centerText(lang === 'en' ? 'Date' : 'Tarikh', xDate, colDate);
    centerText(lang === 'en' ? 'QTY' : 'Kuantiti', xQty, colQty);
    if (includeNotes) centerText(lang === 'en' ? 'Notes' : 'Catatan', xNotes, colNotes);
    centerText('Menu', xMenu, colMenu);

    activeMeals.forEach((meal, i) => {
      const rawLabel = mealLabels[meal] || meal;
      const shortLabel =
        lang === 'en'
          ? (rawLabel.split('/')[1] || rawLabel).trim()
          : (rawLabel.split('/')[0] || rawLabel).trim();
      centerText(shortLabel, xMealsStart + i * mealColWidth, mealColWidth);
    });

    centerText('RM', xRM, colRM);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.15);
    [
      xQty,
      xNotes,
      xMenu,
      xMealsStart,
      ...activeMeals.map((_, i) => xMealsStart + i * mealColWidth),
      xRM,
    ].forEach((x) => {
      if (x > xDate && x < xRM + colRM) {
        doc.line(x, r2Y, x, r2Y + 7);
      }
    });

    return r2Y + 7;
  };

  let currentY = 57;
  currentY = drawMatrixHeader(currentY);
  let grandTotal = 0;

  orders.forEach((order) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const formattedDateVal = formatDate(order.eventDate || order.date);
    const splitDate = doc.splitTextToSize(formattedDateVal, colDate - 2);
    const splitNotes = includeNotes ? doc.splitTextToSize(order.notes || '-', colNotes - 2) : [];
    const splitMenu = doc.splitTextToSize(order.menu || 'Set Box', colMenu - 2);
    const qtyStr = (order.quantity || order.guests || 0).toString();

    const maxLines = Math.max(splitDate.length, splitNotes.length, splitMenu.length, 1);
    const rowHeight = Math.max(7, maxLines * 4 + 3);

    // Landscape page height is 210mm; footer reserve starts at ~185mm
    if (currentY + rowHeight > 180) {
      doc.addPage();
      pageNumber++;
      drawPageHeader(pageNumber);
      currentY = 40;
      currentY = drawMatrixHeader(currentY);
    }

    doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
    doc.rect(15, currentY, 267, rowHeight, 'F');

    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.35);
    doc.rect(15, currentY, 267, rowHeight, 'S');

    [
      xQty,
      xNotes,
      xMenu,
      xMealsStart,
      ...activeMeals.map((_, i) => xMealsStart + i * mealColWidth),
      xRM,
    ].forEach((x) => {
      if ((x > xDate && x < xRM + colRM && x !== xNotes) || (includeNotes && x === xNotes)) {
        doc.line(x, currentY, x, currentY + rowHeight);
      }
    });

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    const textY = currentY + 5;

    doc.text(splitDate, xDate + colDate / 2, textY, { align: 'center' });
    doc.text(qtyStr, xQty + colQty / 2, textY, { align: 'center' });
    if (includeNotes) doc.text(splitNotes, xNotes + colNotes / 2, textY, { align: 'center' });
    doc.text(splitMenu, xMenu + colMenu / 2, textY, { align: 'center' });

    activeMeals.forEach((meal, i) => {
      if (
        Array.isArray(order.meals) &&
        order.meals.includes(meal) &&
        order.prices &&
        order.prices[meal] !== undefined
      ) {
        const val = Number(order.prices[meal]) || 0;
        doc.text(val.toFixed(2), xMealsStart + i * mealColWidth + mealColWidth / 2, textY, {
          align: 'center',
        });
      } else {
        doc.text('-', xMealsStart + i * mealColWidth + mealColWidth / 2, textY, {
          align: 'center',
        });
      }
    });

    const totalNum = Number(order.totalAmount) || 0;
    doc.text(totalNum.toFixed(2), xRM + colRM - 2, textY, { align: 'right' });
    grandTotal += totalNum;
    currentY += rowHeight;
  });

  // Grand total row
  if (currentY + 25 > 185) {
    doc.addPage();
    pageNumber++;
    drawPageHeader(pageNumber);
    currentY = 40;
  }

  doc.setFillColor(cDeepGold[0], cDeepGold[1], cDeepGold[2]);
  doc.rect(15, currentY, 267, 7.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(lang === 'en' ? 'GRAND TOTAL' : 'JUMLAH KESELURUHAN', 18, currentY + 5.2);
  doc.text(`RM ${grandTotal.toFixed(2)}`, xRM + colRM - 2, currentY + 5.2, { align: 'right' });
  currentY += 12;

  // Amount in words
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8);
  const spelledConsolidated =
    lang === 'en'
      ? `Ringgit Malaysia: ${enWords(grandTotal)} only.`
      : `Ringgit Malaysia: ${bmWords(grandTotal)} sahaja.`;
  doc.text(spelledConsolidated, 15, currentY);

  // Footer on all pages (Landscape A4: width 297, height 210)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.3);
    const bank = getBankDetails();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(114, 80, 20);
    doc.text(`${bank.bankName} | ${bank.bankAccountName} | ${bank.bankAccountNumber}`, 148.5, 193, {
      align: 'center',
    });
    doc.line(15, 198, 282, 198);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(135, 125, 115);
    doc.text(INVOICE_BUSINESS.address, 148.5, 203, { align: 'center' });
    doc.text(`${lang === 'en' ? 'Page' : 'Muka Surat'} ${i} / ${totalPages}`, 282, 203, {
      align: 'right',
    });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
