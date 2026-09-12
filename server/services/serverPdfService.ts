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
    bankName: process.env.BANK_NAME || process.env.VITE_BANK_NAME || 'Maybank Islamic',
    bankAccountName: process.env.BANK_ACCOUNT_NAME || process.env.VITE_BANK_ACCOUNT_NAME || 'RESTORAN WAWASAN PAK USOP',
    bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || process.env.VITE_BANK_ACCOUNT_NUMBER || 'XXXX-XXXX-XXXX',
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

function bilingualWords(num: number) {
  return {
    bm: `Ringgit Malaysia: ${bmWords(num)} sahaja.`,
    en: `Ringgit Malaysia: ${enWords(num)} only.`,
  };
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
function drawHeaderBackground(doc: jsPDF, headerHeight = 36) {
  // Light cream background matching client PDF (252, 249, 242)
  doc.setFillColor(252, 249, 242);
  doc.rect(0, 0, 210, headerHeight, 'F');

  if (cachedJawiBase64) {
    try {
      doc.setGState(doc.GState({ opacity: 0.12 }));
      doc.addImage(cachedJawiBase64, 'JPEG', 0, 0, 210, headerHeight, undefined, 'MEDIUM');
      doc.setGState(doc.GState({ opacity: 1 }));
    } catch { /* continue without image */ }
  }

  // Gold dividing line at bottom of header matching client PDF
  doc.setDrawColor(194, 147, 45);
  doc.setLineWidth(0.4);
  doc.line(15, headerHeight, 195, headerHeight);
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
export async function generateServerInvoicePdf(
  order: Record<string, any>,
  isFinal: boolean
): Promise<Buffer> {
  ensureImagesLoaded();

  const lang: 'en' | 'bm' = order.lang === 'en' ? 'en' : 'bm';
  const { bankName, bankAccountName, bankAccountNumber } = getBankDetails();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── PAGE 1: Full invoice with header, client block, table, totals ───────────
  const headerHeight = 36;
  drawHeaderBackground(doc, headerHeight);

  // Logo (matching client PDF position: x=15, y=8, w=20, h=20)
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
  const docNoLabel = isQuoteDoc 
    ? (lang === 'en' ? 'Quote No' : 'No. Sebut Harga')
    : (lang === 'en' ? 'Invoice No' : 'No. Invois');

  // Title in Gold (#A67C1E / 166, 124, 30)
  doc.setTextColor(166, 124, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(docTitle, 195, 20, { align: 'right' });

  // Invoice/Quotation metadata (right side) in Charcoal (26, 24, 22)
  doc.setTextColor(26, 24, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const formattedInvoiceDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const invoiceNoVal = order.invoiceNo || (isFinal ? 'PENDING' : 'SEBUT HARGA');
  doc.text(`${docNoLabel}: ${invoiceNoVal}`, 195, 27, { align: 'right' });
  doc.text(`${lang === 'en' ? 'Date' : 'Tarikh'}: ${formattedInvoiceDate}`, 195, 32, { align: 'right' });

  // ── Client block ──────────────────────────────────────────────────────────
  doc.setTextColor(40, 35, 30);
  const clientBlockY = headerHeight + 5;

  // TO: box
  doc.setFillColor(240, 245, 240);
  doc.setDrawColor(180, 200, 180);
  doc.roundedRect(5, clientBlockY, 110, 40, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 100, 60);
  doc.text(lang === 'en' ? 'TO:' : 'KEPADA / TO:', 9, clientBlockY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  const companyLines = doc.splitTextToSize(order.to || 'Pelanggan', 98);
  doc.text(companyLines, 9, clientBlockY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);

  const deptVal = order.department || order.division;
  let curClientY = clientBlockY + 18;
  if (deptVal && deptVal.trim() !== '') {
    const deptLabel = lang === 'en' ? 'Div/Dept' : 'Bahagian/Jabatan';
    doc.text(`${deptLabel}: ${deptVal.trim()}`, 9, curClientY);
    curClientY += 4.5;
  }
  if (order.attn && order.attn.trim() !== '') {
    doc.text(`Attn / U.P: ${order.attn.trim()}`, 9, curClientY);
    curClientY += 4.5;
  }
  doc.text(`Tel: ${order.contact || '-'}`, 9, curClientY);
  curClientY += 4.5;
  doc.text(`Email: ${order.email || '-'}`, 9, curClientY);

  // Order detail boxes (right side of client block)
  const boxY = clientBlockY;
  const deliveryDate = formatDate(order.eventDate || order.date);
  const deliveryTime = order.time || '-';

  drawCreamBox(doc, 'Rujukan / Reference', `#${order.id?.slice(0, 8).toUpperCase() || '-'}`, 120, boxY, 85, 14, true);
  drawCreamBox(doc, 'Tarikh Penghantaran / Date', deliveryDate, 120, boxY + 15, 85, 14, true);
  drawCreamBox(doc, 'Masa / Time', deliveryTime, 120, boxY + 30, 40, 14, true);
  const prepLabel = order.preparationType === 'meal_box' ? 'Set Box / Bungkus' : 'Bufet / Sajian Hidang';
  drawCreamBox(doc, 'Jenis / Type', prepLabel, 165, boxY + 30, 40, 14, true);

  // ── Menu section ──────────────────────────────────────────────────────────
  const menuY = clientBlockY + 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text('MENU', 18, menuY);

  const menuStr = order.menu || 'Set Box Makanan & Minuman';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const menuLines = doc.splitTextToSize(menuStr, 170);
  doc.text(menuLines, 18, menuY + 6);

  // ── Table header ──────────────────────────────────────────────────────────
  const tableStartY = menuY + 8 + Math.min(menuLines.length, 4) * 4.5;
  doc.setFillColor(26, 24, 22);
  doc.rect(5, tableStartY, 200, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const headerLabels = lang === 'bm'
    ? { item: 'PERKARA / BUTIRAN', price: 'HARGA/PAX (RM)', total: 'JUMLAH (RM)' }
    : { item: 'DESCRIPTION', price: 'PRICE/PAX (RM)', total: 'TOTAL (RM)' };
  doc.text(headerLabels.item, 18, tableStartY + 4.8);
  doc.text(headerLabels.price, 137.5, tableStartY + 4.8, { align: 'center' });
  doc.text(headerLabels.total, 192, tableStartY + 4.8, { align: 'right' });

  // ── Table rows (one per meal type) ────────────────────────────────────────
  let currentY = tableStartY + 8;
  const quantity = Number(order.quantity || order.guests || order.pax || 0);
  const meals: string[] = Array.isArray(order.meals) ? order.meals : ['default'];
  const prices: Record<string, number> = order.prices || {};
  let grandTotal = 0;

  meals.forEach((meal, idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 248 : 255, isEven ? 248 : 255, isEven ? 244 : 255);
    doc.rect(5, currentY, 200, 10, 'F');
    doc.setDrawColor(220, 215, 205);
    doc.line(5, currentY, 205, currentY);

    const mealLabel = mealLabels[meal] || meal;
    const priceVal = prices[meal] ?? prices['default'] ?? 0;
    const subtotal = priceVal * quantity;
    grandTotal += subtotal;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 20, 20);

    const desc = lang === 'bm'
      ? `Perkhidmatan Katering: ${mealLabel}`
      : `Catering Services: ${mealLabel}`;
    doc.text(desc, 18, currentY + 4.8);

    // Quantity
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`${quantity} pax`, 18, currentY + 8.5);

    if (isFinal && priceVal > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(20, 20, 20);
      doc.text(priceVal.toFixed(2), 137.5, currentY + 4.8, { align: 'center' });
      doc.text(subtotal.toFixed(2), 192, currentY + 4.8, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(7.5);
      doc.setTextColor(140, 100, 40);
      doc.text(lang === 'bm' ? 'Menunggu pengesahan' : 'Pending confirmation', 137.5, currentY + 4.8, { align: 'center' });
      doc.text(lang === 'bm' ? 'Sebut harga' : 'Quotation', 192, currentY + 4.8, { align: 'right' });
    }

    currentY += 10;
  });

  // Grand total row
  doc.setFillColor(26, 24, 22);
  doc.rect(5, currentY, 200, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(lang === 'bm' ? 'JUMLAH KESELURUHAN / GRAND TOTAL' : 'GRAND TOTAL', 18, currentY + 4.8);

  if (isFinal && grandTotal > 0) {
    doc.text(`RM ${grandTotal.toFixed(2)}`, 192, currentY + 4.8, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bolditalic');
    doc.text(lang === 'bm' ? '(Menunggu sebut harga)' : '(Pending quotation)', 192, currentY + 4.8, { align: 'right' });
  }
  currentY += 10;

  // ── Amount in words ───────────────────────────────────────────────────────
  const textNoteY = currentY + 5;
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8);
  doc.setTextColor(40, 35, 30);

  if (isFinal && grandTotal > 0) {
    const bilingual = bilingualWords(grandTotal);
    doc.text(bilingual.bm, 15, textNoteY);
    doc.text(bilingual.en, 15, textNoteY + 4);
  } else {
    doc.text(lang === 'bm'
      ? 'Ringgit Malaysia: ____________________________________________________________________ sahaja.'
      : 'Ringgit Malaysia: ____________________________________________________________________ only.',
      15, textNoteY);
    doc.text(lang === 'bm'
      ? 'Ringgit Malaysia: ____________________________________________________________________ only.'
      : 'Ringgit Malaysia: ____________________________________________________________________ sahaja.',
      15, textNoteY + 4);
  }

  // ── Disclaimer ────────────────────────────────────────────────────────────
  const disclaimerY = textNoteY + 12;
  doc.setFillColor(250, 248, 244);
  doc.setDrawColor(220, 210, 195);
  doc.roundedRect(5, disclaimerY, 200, 12, 2, 2, 'FD');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 90, 80);
  doc.text('* Harga yang diberikan termasuk caj perkhidmatan & set pembungkusan biodegradable.', 18, disclaimerY + 3);
  doc.text('* The price given includes service charge & biodegradable packaging sets.', 18, disclaimerY + 6.5);

  // ── Bank details ──────────────────────────────────────────────────────────
  const bankBoxY = disclaimerY + 18;
  doc.setFillColor(235, 245, 235);
  doc.setDrawColor(160, 200, 160);
  doc.roundedRect(5, bankBoxY, 95, 32, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 100, 40);
  doc.text('MAKLUMAT AKAUN BANK / BANK ACCOUNT DETAILS', 18, bankBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(lang === 'en' ? 'Name' : 'Nama', 18, bankBoxY + 11);
  doc.text('Bank', 18, bankBoxY + 15);
  doc.text(lang === 'en' ? 'Account No.' : 'No. Akaun', 18, bankBoxY + 19);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(bankAccountName, 42, bankBoxY + 11);
  doc.text(bankName, 42, bankBoxY + 15);
  doc.text(bankAccountNumber, 42, bankBoxY + 19);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(lang === 'bm' ? '* Sila nyatakan No. Invois sebagai rujukan pembayaran.' : '* Please quote Invoice No. as payment reference.', 18, bankBoxY + 25);

  // ── Signature block ───────────────────────────────────────────────────────
  const sigBoxY = bankBoxY;
  doc.setFillColor(248, 248, 255);
  doc.setDrawColor(180, 180, 220);
  doc.roundedRect(115, sigBoxY, 90, 32, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 100);
  doc.text(lang === 'bm' ? 'DISAHKAN OLEH / AUTHORIZED BY' : 'AUTHORIZED BY', 160, sigBoxY + 5, { align: 'center' });
  doc.setDrawColor(150, 150, 150);
  doc.line(125, sigBoxY + 24, 195, sigBoxY + 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('Restoran Wawasan Pak Usop', 160, sigBoxY + 28, { align: 'center' });

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text('Restoran Wawasan  |  Unit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya', 105, 285, { align: 'center' });

  // ── Return as Buffer ──────────────────────────────────────────────────────
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generates a consolidated PDF invoice for multiple orders and returns a Buffer.
 */
export async function generateServerConsolidatedInvoicePdf(
  orders: Record<string, any>[],
  invoiceNo?: string,
  includeNotes: boolean = false,
  lang: 'bm' | 'en' = 'bm'
): Promise<Buffer> {
  ensureImagesLoaded();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const cCreamBg = [250, 247, 240];
  const cGoldBorder = [194, 147, 45];
  const cHeaderGold = [166, 124, 30];
  const cDarkBrown = [96, 64, 8];
  const cCharcoal = [26, 24, 22];

  const drawPageHeader = (pageNumber: number) => {
    drawHeaderBackground(doc, 38);

    if (cachedLogoBase64) {
      try {
        doc.addImage(cachedLogoBase64, 'PNG', 15, 12, 21, 21);
      } catch { /* continue */ }
    }

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('RESTORAN WAWASAN', 40, 18);

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Unit 3, Level B3, Menara PjH', 40, 23);
    doc.text('Jalan P2a, Presint 2, 62100 Putrajaya', 40, 27);
    doc.text('W.P Putrajaya', 40, 31);

    doc.setTextColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('COMBINED INVOICE', 195, 22, { align: 'right' });

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`${lang === 'en' ? 'Invoice No' : 'No. Invois'}: ${invoiceNo || 'COMBINED'}`, 195, 27, { align: 'right' });
    doc.text(`Tarikh / Date: ${formatDate(new Date().toISOString())}`, 195, 32, { align: 'right' });
    if (pageNumber > 1) {
      doc.text(`Page ${pageNumber}`, 195, 36, { align: 'right' });
    }
  };

  let pageNumber = 1;
  drawPageHeader(pageNumber);

  const firstOrder = orders[0] || {};
  const recipientText = (firstOrder.to || 'Pelanggan') + (firstOrder.attn ? ` (Attn: ${firstOrder.attn})` : '');
  drawCreamBox(doc, 'KEPADA / TO', recipientText, 15, 42, 180, 15, true);

  const allPossibleMeals = ['breakfast', 'lunch', 'tea_break', 'hi_tea', 'dinner'];
  const activeMeals = allPossibleMeals.filter(m => orders.some(o => Array.isArray(o.meals) && o.meals.includes(m)));

  const startX = 15;
  const colDate = 22;
  const colQty = 12;
  const colNotes = includeNotes ? 28 : 0;
  const colMealsWidth = Math.max(activeMeals.length * 15, 30);
  const colRM = 20;
  const colMenu = 180 - colDate - colQty - colNotes - colMealsWidth - colRM;

  const xDate = startX;
  const xQty = xDate + colDate;
  const xNotes = xQty + colQty;
  const xMenu = includeNotes ? xNotes + colNotes : xNotes;
  const xMealsStart = xMenu + colMenu;
  const xRM = xMealsStart + colMealsWidth;

  const drawMatrixHeader = (y: number) => {
    doc.setFillColor(cHeaderGold[0], cHeaderGold[1], cHeaderGold[2]);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('ORDER DETAILS', xDate + (xMealsStart - xDate) / 2, y + 4.8, { align: 'center' });

    if (activeMeals.length > 0) {
      doc.line(xMealsStart, y, xMealsStart, y + 7);
      doc.text('PRICE / PAX (RM)', xMealsStart + colMealsWidth / 2, y + 4.8, { align: 'center' });
    }

    doc.line(xRM, y, xRM, y + 7);
    doc.text('TOTAL', xRM + colRM / 2, y + 4.8, { align: 'center' });

    const r2Y = y + 7;
    doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
    doc.rect(15, r2Y, 180, 7, 'F');

    doc.setFontSize(7.5);
    const centerText = (txt: string, x: number, w: number) => {
      doc.text(txt, x + w / 2, r2Y + 4.8, { align: 'center' });
    };

    centerText('Date', xDate, colDate);
    centerText('QTY', xQty, colQty);
    if (includeNotes) centerText('Notes', xNotes, colNotes);
    centerText('Menu', xMenu, colMenu);

    activeMeals.forEach((meal, i) => {
      const shortLabel = mealLabels[meal] || meal;
      centerText(shortLabel.split('/')[0].trim(), xMealsStart + (i * 15), 15);
    });

    centerText('RM', xRM, colRM);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    [xQty, xNotes, xMenu, xMealsStart, ...activeMeals.map((_, i) => xMealsStart + i * 15), xRM].forEach(x => {
      if (x > xDate && x < xRM + colRM) {
        doc.line(x, r2Y, x, r2Y + 7);
      }
    });

    return r2Y + 7;
  };

  let currentY = 62;
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

    if (currentY + rowHeight > 265) {
      doc.addPage();
      pageNumber++;
      drawPageHeader(pageNumber);
      currentY = 42;
      currentY = drawMatrixHeader(currentY);
    }

    doc.setFillColor(cCreamBg[0], cCreamBg[1], cCreamBg[2]);
    doc.rect(15, currentY, 180, rowHeight, 'F');

    doc.setDrawColor(cGoldBorder[0], cGoldBorder[1], cGoldBorder[2]);
    doc.setLineWidth(0.35);
    doc.rect(15, currentY, 180, rowHeight, 'S');

    doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
    const textY = currentY + 5;

    doc.text(splitDate, xDate + colDate / 2, textY, { align: 'center' });
    doc.text(qtyStr, xQty + colQty / 2, textY, { align: 'center' });
    if (includeNotes) doc.text(splitNotes, xNotes + colNotes / 2, textY, { align: 'center' });
    doc.text(splitMenu, xMenu + colMenu / 2, textY, { align: 'center' });

    activeMeals.forEach((meal, i) => {
      if (Array.isArray(order.meals) && order.meals.includes(meal) && order.prices && order.prices[meal] !== undefined) {
        const val = Number(order.prices[meal]) || 0;
        doc.text(val.toFixed(2), xMealsStart + (i * 15) + 7.5, textY, { align: 'center' });
      } else {
        doc.text('-', xMealsStart + (i * 15) + 7.5, textY, { align: 'center' });
      }
    });

    const totalNum = Number(order.totalAmount) || 0;
    doc.text(totalNum.toFixed(2), xRM + colRM - 2, textY, { align: 'right' });
    grandTotal += totalNum;
    currentY += rowHeight;
  });

  // Grand total row
  doc.setFillColor(cDarkBrown[0], cDarkBrown[1], cDarkBrown[2]);
  doc.rect(15, currentY, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('JUMLAH KESELURUHAN / GRAND TOTAL', 18, currentY + 4.8);
  doc.text(`RM ${grandTotal.toFixed(2)}`, xRM + colRM - 2, currentY + 4.8, { align: 'right' });
  currentY += 12;

  // Amount in words
  doc.setTextColor(cCharcoal[0], cCharcoal[1], cCharcoal[2]);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8);
  const bilingual = bilingualWords(grandTotal);
  doc.text(bilingual.bm, 15, currentY);
  doc.text(bilingual.en, 15, currentY + 4);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('Restoran Wawasan  |  Unit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya', 105, 285, { align: 'center' });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

