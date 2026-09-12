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

// ─── Bank details (env vars, same names as on Render dashboard) ──────────────
function getBankDetails() {
  return {
    bankName: process.env.BANK_NAME || process.env.VITE_BANK_NAME || 'Bank Muamalat',
    bankAccountName: process.env.BANK_ACCOUNT_NAME || process.env.VITE_BANK_ACCOUNT_NAME || 'RESTORAN WAWASAN',
    bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || process.env.VITE_BANK_ACCOUNT_NUMBER || '16010000-405710',
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
  ];
  for (const relPath of relativePaths) {
    for (const base of bases) {
      const full = path.join(base, relPath);
      try {
        if (fs.existsSync(full)) {
          return fs.readFileSync(full).toString('base64');
        }
      } catch { /* try next */ }
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
  if (imagesLoaded) return;
  cachedLogoBase64 = loadImageBase64([
    'assets/brand/apk_logo_clean.png',
    'assets/brand/wawasan_logo.png',
    'assets/brand/wawasan_logo_fallback.png',
  ]);
  cachedJawiBase64 = loadImageBase64([
    'assets/heritage/batik_pattern.jpg',
    'assets/heritage/batik_pattern_hd.jpg',
    'assets/heritage/batik_vector_pattern.jpg',
    'assets/heritage/Jawi.jpg',
  ]);
  imagesLoaded = true;
  if (!cachedLogoBase64)  console.warn('[serverPdfService] Logo image not found — PDF will render without logo.');
  if (!cachedJawiBase64)  console.warn('[serverPdfService] Jawi image not found — PDF will render with clean header background.');
}

// ─── Amount-in-words (inlined from src/services/numberToWordsBM.ts) ───────────
function bmWords(num: number): string {
  if (num === 0) return 'Kosong';
  const units = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Lapan', 'Sembilan',
    'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas',
    'Enam Belas', 'Tujuh Belas', 'Lapan Belas', 'Sembilan Belas'];
  const tens = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
    'Enam Puluh', 'Tujuh Puluh', 'Lapan Puluh', 'Sembilan Puluh'];
  const lt1000 = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
    const h = Math.floor(n / 100), r = n % 100;
    return (h === 1 ? 'Seratus' : units[h] + ' Ratus') + (r ? ' ' + lt1000(r) : '');
  };
  const whole = (n: number): string => {
    if (n === 0) return 'Kosong';
    let res = '', si = 0;
    while (n > 0) {
      const c = n % 1000;
      if (c !== 0) {
        const cw = lt1000(c);
        if (si === 0) res = cw;
        else if (si === 1) res = (c === 1 ? 'Seribu' : cw + ' Ribu') + (res ? ' ' + res : '');
        else if (si === 2) res = (c === 1 ? 'Sejuta' : cw + ' Juta') + (res ? ' ' + res : '');
        else res = cw + (res ? ' ' + res : '');
      }
      n = Math.floor(n / 1000); si++;
    }
    return res;
  };
  const ip = Math.floor(num), dp = Math.round((num - ip) * 100);
  return whole(ip) + (dp > 0 ? ' dan ' + whole(dp) + ' Sen' : '');
}

function enWords(num: number): string {
  if (num === 0) return 'Zero';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const lt1000 = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + units[n % 10] : '');
    const h = Math.floor(n / 100), r = n % 100;
    return units[h] + ' Hundred' + (r ? ' ' + lt1000(r) : '');
  };
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  const whole = (n: number): string => {
    if (n === 0) return 'Zero';
    let res = '', si = 0;
    while (n > 0) {
      const c = n % 1000;
      if (c !== 0) res = lt1000(c) + (si > 0 ? ' ' + scales[si] : '') + (res ? ' ' + res : '');
      n = Math.floor(n / 1000); si++;
    }
    return res;
  };
  const ip = Math.floor(num), dp = Math.round((num - ip) * 100);
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
  } catch { return trimmed; }
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
  // Light cream background matching client PDF (252, 249, 242)
  doc.setFillColor(252, 249, 242);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  if (cachedJawiBase64) {
    try {
      doc.setGState(doc.GState({ opacity: 0.12 }));
      doc.addImage(cachedJawiBase64, 'JPEG', 0, 0, pageWidth, headerHeight, undefined, 'MEDIUM');
      doc.setGState(doc.GState({ opacity: 1 }));
    } catch { /* continue without image */ }
  }

  // Gold dividing line at bottom of header matching client PDF
  doc.setDrawColor(194, 147, 45);
  doc.setLineWidth(0.4);
  doc.line(15, headerHeight, pageWidth - 15, headerHeight);
}

function drawCreamBox(
  doc: jsPDF,
  label: string, content: string | string[],
  x: number, y: number, w: number, h: number,
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
  // Header background (Clean white background, only the gold dividing line at the bottom)
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 36, 'F');
  
  // Gold dividing line under header
  doc.setDrawColor(194, 147, 45);
  doc.setLineWidth(0.4);
  doc.line(15, 36, 195, 36);

  // Logo (x=15, y=8, w=20, h=20)
  if (cachedLogoBase64) {
    try {
      doc.addImage(cachedLogoBase64, 'PNG', 15, 8, 20, 20);
    } catch { /* continue */ }
  }

  // Restoran details in Gold (#A67C1E / 166, 124, 30) and Charcoal (26, 24, 22)
  doc.setTextColor(166, 124, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RESTORAN WAWASAN', 39, 16);
  doc.setTextColor(26, 24, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Unit 3, Level B3, Menara PjH', 39, 21);
  doc.text('Jalan P2a, Presint 2, 62100 Putrajaya', 39, 25);
  doc.text('W.P Putrajaya', 39, 29);

  // Determine document type (Quotation vs Invoice)
  const isQuoteDoc = (order.invoiceNo && order.invoiceNo.startsWith('QT')) || (!isFinal && order.status === 'pending');
  const docTitle = isQuoteDoc 
    ? (lang === 'en' ? 'QUOTATION' : 'SEBUT HARGA')
    : (lang === 'en' ? 'INVOICE' : 'INVOIS');

  // Title in Gold (#A67C1E / 166, 124, 30)
  doc.setTextColor(166, 124, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(docTitle, 195, 20, { align: 'right' });

  // Invoice/Quotation date (right side)
  doc.setTextColor(26, 24, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const formattedInvoiceDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(`${lang === 'en' ? 'Date' : 'Tarikh'}: ${formattedInvoiceDate}`, 195, 27, { align: 'right' });

  // ── Metadata Boxes on Page 1 (Y: 40 to 94) ──
  const invoiceNoVal = order.invoiceNo || (isFinal ? 'PENDING' : (lang === 'en' ? 'QUOTATION' : 'SEBUT HARGA'));
  const deliveryDate = formatDate(order.eventDate || order.date);
  
  // Row 1: Invoice No & Event Date
  drawInvoiceBox(
    doc, 
    isQuoteDoc 
      ? (lang === 'en' ? 'QUOTATION NO.' : 'NO. SEBUT HARGA')
      : (lang === 'en' ? 'INVOICE NO.' : 'NO. INVOIS'), 
    invoiceNoVal, 
    15, 40, 85, 12, true
  );
  drawInvoiceBox(doc, lang === 'en' ? 'EVENT DATE' : 'TARIKH ACARA', deliveryDate, 110, 40, 85, 12, true);

  // Row 2: Kepada / To
  const recipientName = order.to || order.name || (lang === 'en' ? 'Valued Customer' : 'Pelanggan Dihormati');
  drawInvoiceBox(doc, lang === 'en' ? 'TO' : 'KEPADA', recipientName, 15, 54, 180, 12, true);

  // Row 3: Location & Meal For
  const locationVal = order.location || (lang === 'en' ? 'Restoran Wawasan (Dine-in / Pickup)' : 'Restoran Wawasan (Makan di Restoran / Ambil Sendiri)');
  const meals: string[] = Array.isArray(order.meals) ? order.meals : ['default'];
  const mealsList = meals.map(m => {
    const raw = mealLabels[m] || m;
    return lang === 'en' ? (raw.split(' / ')[1] || raw) : (raw.split(' / ')[0] || raw);
  }).join(', ');
  drawInvoiceBox(doc, lang === 'en' ? 'EVENT LOCATION' : 'LOKASI ACARA', locationVal, 15, 68, 85, 12, true);
  drawInvoiceBox(doc, lang === 'en' ? 'MEAL TYPE' : 'JENIS HIDANGAN', mealsList, 110, 68, 85, 12, true);

  // Row 4: Quantity / Pax
  const quantity = Number(order.quantity || order.guests || order.pax || 0);
  drawInvoiceBox(doc, lang === 'en' ? 'QUANTITY' : 'BILANGAN PAX', `${quantity} Pax`, 15, 82, 180, 12, true);

  // ── Table Starts (Y = 98) ──
  const tableStartY = 98;
  doc.setFillColor(114, 80, 20); // Deep Royal Bronze-Gold (#725014)
  doc.rect(15, tableStartY, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const headerLabels = lang === 'bm'
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

    const desc = lang === 'bm'
      ? `Perkhidmatan Katering: ${mealLabel.split(' / ')[0]}`
      : `Catering Services: ${mealLabel.split(' / ')[1] || mealLabel}`;
    doc.text(desc, 18, currentY + 4.8);

    // If there is menu content and it's the first row, draw it
    if (idx === 0 && order.menu) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(95, 85, 75);
      const truncatedMenu = order.menu.length > 55 ? order.menu.substring(0, 52) + '...' : order.menu;
      doc.text(truncatedMenu, 18, currentY + 8.2);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(95, 85, 75);
      doc.text(`${quantity} Pax`, 18, currentY + 8.2);
    }

    if (isFinal && priceVal > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(26, 24, 22);
      doc.text(priceVal.toFixed(2), 137.5, currentY + 6, { align: 'center' });
      doc.text(subtotal.toFixed(2), 192, currentY + 6, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(7.5);
      doc.setTextColor(166, 124, 30);
      doc.text(lang === 'bm' ? 'Menunggu pengesahan' : 'Pending confirmation', 137.5, currentY + 6, { align: 'center' });
      doc.text(lang === 'bm' ? 'Sebut harga' : 'Quotation', 192, currentY + 6, { align: 'right' });
    }

    currentY += 10;
  });

  // End vertical line border for rows
  doc.setDrawColor(226, 220, 210);
  doc.line(15, currentY, 195, currentY);

  // Grand total row
  doc.setFillColor(114, 80, 20); // Deep Royal Bronze-Gold (#725014)
  doc.rect(15, currentY, 180, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(lang === 'bm' ? 'JUMLAH KESELURUHAN' : 'GRAND TOTAL', 18, currentY + 6.2);

  if (isFinal && grandTotal > 0) {
    doc.text(`RM ${grandTotal.toFixed(2)}`, 192, currentY + 6.2, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bolditalic');
    doc.text(lang === 'bm' ? '(Menunggu sebut harga)' : '(Pending quotation)', 192, currentY + 6.2, { align: 'right' });
  }
  currentY += 10;

  // ── Amount in words ──
  const textNoteY = currentY + 5;
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8);
  doc.setTextColor(35, 30, 25);

  if (isFinal && grandTotal > 0) {
    const spelled = lang === 'en' ? enWords(grandTotal) : bmWords(grandTotal);
    doc.text(spelled, 15, textNoteY);
  } else {
    const blankSpelling = lang === 'en'
      ? 'Ringgit Malaysia: ____________________________________________________________________ only.'
      : 'Ringgit Malaysia: ____________________________________________________________________ sahaja.';
    doc.text(blankSpelling, 15, textNoteY);
  }

  // ── Disclaimer ──
  const disclaimerY = textNoteY + 8;
  doc.setFillColor(253, 252, 250); // Clean warm ivory (#FDFCFA)
  doc.setDrawColor(194, 147, 45); // Gold border (#C2932D)
  doc.setLineWidth(0.3);
  doc.roundedRect(15, disclaimerY, 180, 10, 2, 2, 'FD');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(105, 95, 85);
  const disclaimerText = lang === 'en'
    ? '* The price given includes service charge & biodegradable packaging sets.'
    : '* Harga yang diberikan termasuk caj perkhidmatan & set pembungkusan mesra alam.';
  doc.text(disclaimerText, 20, disclaimerY + 6);

  // ── Bank Account Details ──
  const bankBoxY = disclaimerY + 14;
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
    20, bankBoxY + 21
  );

  // Footer for Page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(135, 125, 115);
  doc.text('Restoran Wawasan  |  Unit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya', 105, 285, { align: 'center' });


  // ── PAGE 2: Person in Charge Details & Signature block ───────────────────────
  doc.addPage();

  // Header background (Clean white background, only the gold dividing line at the bottom)
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 36, 'F');
  
  // Gold dividing line under header on Page 2
  doc.setDrawColor(194, 147, 45);
  doc.setLineWidth(0.4);
  doc.line(15, 36, 195, 36);

  // Title gold
  doc.setTextColor(166, 124, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const page2Title = isQuoteDoc
    ? (lang === 'en' ? 'RESTORAN WAWASAN — QUOTATION' : 'RESTORAN WAWASAN — SEBUT HARGA')
    : (lang === 'en' ? 'RESTORAN WAWASAN — INVOICE' : 'RESTORAN WAWASAN — INVOIS');
  doc.text(page2Title, 15, 20);
  
  doc.setTextColor(105, 95, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(lang === 'en' ? 'Person in Charge Details' : 'Maklumat Pegawai Bertanggungjawab', 15, 26);

  // Top Title Bar for Person in Charge (Balanced with Page 1 Table Header)
  doc.setFillColor(114, 80, 20); // Deep Royal Bronze-Gold (#725014)
  doc.rect(15, 42, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(lang === 'en' ? 'PERSON IN CHARGE DETAILS' : 'BUTIRAN PEGAWAI BERTANGGUNGJAWAB', 20, 47.2);

  // PIC Metadata Boxes
  const picName = order.picName || order.pocName || order.contactName || '-';
  const picPhone = order.picPhone || order.pocPhone || order.contactNumber || order.contact || '-';
  const picDept = order.department || order.division || '-';
  const picAttn = order.attn || '-';
  const picEmail = order.picEmail || order.pocEmail || order.email || '-';
  const specialNotes = order.notes || order.specialNotes || '-';

  // Row 1: Name & Phone
  drawInvoiceBox(doc, lang === 'en' ? 'NAME' : 'NAMA', picName, 15, 54, 85, 12, true);
  drawInvoiceBox(doc, lang === 'en' ? 'CONTACT NUMBER' : 'NO. TELEFON', picPhone, 110, 54, 85, 12, true);

  // Row 2: Department & ATTN
  drawInvoiceBox(doc, lang === 'en' ? 'DEPARTMENT' : 'JABATAN', picDept, 15, 68, 85, 12, true);
  drawInvoiceBox(doc, lang === 'en' ? 'ATTENTION (ATTN)' : 'UNTUK PERHATIAN (ATTN)', picAttn, 110, 68, 85, 12, true);

  // Row 3: Email (Full width)
  drawInvoiceBox(doc, lang === 'en' ? 'EMAIL' : 'E-MEL', picEmail, 15, 82, 180, 12, true);

  // Row 4: Notes (Full width, taller)
  drawInvoiceBox(doc, lang === 'en' ? 'SPECIAL NOTES' : 'NOTA KHAS', specialNotes, 15, 96, 180, 25, true);

  // Prepared By Section (DISEDIAKAN OLEH)
  const preparedByY = 135;
  doc.setTextColor(166, 124, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(lang === 'en' ? 'PREPARED BY' : 'DISEDIAKAN OLEH', 15, preparedByY);
  
  doc.setTextColor(26, 24, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Restoran Wawasan', 15, preparedByY + 6);
  
  // Signature Line
  doc.setDrawColor(194, 147, 45); // Gold line (#C2932D)
  doc.setLineWidth(0.4);
  doc.line(15, preparedByY + 22, 85, preparedByY + 22);

  // Footers for Page 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(135, 125, 115);
  doc.text(
    lang === 'en'
      ? 'Thank you for your trust  |  ON BEHALF OF RESTORAN WAWASAN'
      : 'Terima kasih di atas kepercayaan anda  |  BAGI PIHAK RESTORAN WAWASAN',
    105, 275, { align: 'center' }
  );
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(135, 125, 115);
  doc.text(
    lang === 'en'
      ? '* This document is computer generated — no company stamp or physical signature required'
      : '* Dokumen ini dijana oleh komputer — tiada tandatangan atau cop fizikal diperlukan',
    105, 280, { align: 'center' }
  );

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
      } catch { /* continue */ }
    }

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('RESTORAN WAWASAN', 39, 16);

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Unit 3, Level B3, Menara PjH, Jalan P2a, Presint 2, 62100 Putrajaya, W.P Putrajaya', 39, 23);

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(lang === 'en' ? 'CONSOLIDATED INVOICE' : 'INVOIS KONSOLIDASI', 282, 20, { align: 'right' });

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${lang === 'en' ? 'Invoice No' : 'No. Invois'}: ${invoiceNo || 'COMBINED'}`, 282, 26, { align: 'right' });
    doc.text(`${lang === 'en' ? 'Date' : 'Tarikh'}: ${formatDate(new Date().toISOString())}`, 282, 30, { align: 'right' });
    if (pageNumber > 1) {
      doc.text(`${lang === 'en' ? 'Page' : 'Muka Surat'} ${pageNumber}`, 282, 34, { align: 'right' });
    }
  };

  let pageNumber = 1;
  drawPageHeader(pageNumber);

  const firstOrder = orders[0] || {};
  const recipientText = (firstOrder.to || (lang === 'en' ? 'Valued Customer' : 'Pelanggan')) + (firstOrder.attn ? ` (Attn: ${firstOrder.attn})` : '');
  drawCreamBox(doc, lang === 'en' ? 'TO' : 'KEPADA', recipientText, 15, 40, 267, 13, true);

  const allPossibleMeals = ['breakfast', 'lunch', 'tea_break', 'hi_tea', 'dinner'];
  const activeMeals = allPossibleMeals.filter(m => orders.some(o => Array.isArray(o.meals) && o.meals.includes(m)));

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

    doc.text(lang === 'en' ? 'ORDER DETAILS' : 'BUTIRAN PESANAN', xDate + (xMealsStart - xDate) / 2, y + 4.8, { align: 'center' });

    if (activeMeals.length > 0) {
      doc.line(xMealsStart, y, xMealsStart, y + 7);
      doc.text(lang === 'en' ? 'PRICE / PAX (RM)' : 'HARGA / PAX (RM)', xMealsStart + colMealsWidth / 2, y + 4.8, { align: 'center' });
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
      const shortLabel = lang === 'en' ? (rawLabel.split('/')[1] || rawLabel).trim() : (rawLabel.split('/')[0] || rawLabel).trim();
      centerText(shortLabel, xMealsStart + (i * mealColWidth), mealColWidth);
    });

    centerText('RM', xRM, colRM);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.15);
    [xQty, xNotes, xMenu, xMealsStart, ...activeMeals.map((_, i) => xMealsStart + i * mealColWidth), xRM].forEach(x => {
      if (x > xDate && x < xRM + colRM) {
        doc.line(x, r2Y, x, r2Y + 7);
      }
    });

    return r2Y + 7;
  };

  let currentY = 57;
  currentY = drawMatrixHeader(currentY);
  let grandTotal = 0;

  orders.forEach(order => {
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

    [xQty, xNotes, xMenu, xMealsStart, ...activeMeals.map((_, i) => xMealsStart + i * mealColWidth), xRM].forEach(x => {
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
      if (Array.isArray(order.meals) && order.meals.includes(meal) && order.prices && order.prices[meal] !== undefined) {
        const val = Number(order.prices[meal]) || 0;
        doc.text(val.toFixed(2), xMealsStart + (i * mealColWidth) + mealColWidth / 2, textY, { align: 'center' });
      } else {
        doc.text('-', xMealsStart + (i * mealColWidth) + mealColWidth / 2, textY, { align: 'center' });
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
  if (lang === 'en') {
    doc.text(enWords(grandTotal), 15, currentY);
  } else {
    doc.text(bmWords(grandTotal), 15, currentY);
  }

  // Footer on all pages (Landscape A4: width 297, height 210)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.3);
    doc.line(15, 198, 282, 198);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(135, 125, 115);
    doc.text('Restoran Wawasan  |  Unit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya', 148.5, 203, { align: 'center' });
    doc.text(`${lang === 'en' ? 'Page' : 'Muka Surat'} ${i} / ${totalPages}`, 282, 203, { align: 'right' });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

