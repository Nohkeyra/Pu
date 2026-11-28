import { INVOICE_BUSINESS } from '../../src/constants/invoiceBusiness.js';
/**
 * serverPdfService.ts
 *
 * Server-side PDF invoice and quotation generator.
 * Runs in Node.js (Express/Render) — no browser DOM, no canvas, no Vite env.
 *
 * Design notes:
 *  - Images loaded via fs.readFileSync()
 *  - process.env for bank/business details fallback
 *  - Returns Buffer (for HTTP download & nodemailer attachments)
 *  - getBilingualWordsInTotal() inlined to avoid pulling browser-only deps into the server build
 */

import path from 'path';
import fs from 'fs';
import { jsPDF } from 'jspdf';
import {
  PDFArray,
  PDFDocument,
  PDFPage,
  PDFRawStream,
  PDFString,
  StandardFonts,
  decodePDFRawStream,
  rgb,
  type PDFFont,
} from 'pdf-lib';
import {
  drawInvoiceCalligraphy,
  INVOICE_CONTACT,
} from '../../src/services/invoicePdfBrand.js';
import { renderInvoiceBatch } from '../../src/services/invoiceBatchPdf.js';
import type { InvoiceBatch } from '../../src/lib/invoiceBatch.js';
import { getVerifiedOrderCompanyCode } from '../../src/lib/petronasAutofill.js';

export type ServerPdfDocumentType = 'invoice' | 'quotation';

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
  const moduleDir = typeof __dirname === 'string' ? __dirname : cwd;
  // Try dist/ first (production), then public/ (dev/local), then fall through.
  const bases = [
    path.join(cwd, 'dist'),
    path.join(cwd, 'public'),
    cwd,
    path.join(moduleDir, '..', 'public'),
    path.join(moduleDir, '..', 'dist'),
    path.join(moduleDir, 'public'),
    path.join(moduleDir, 'dist'),
    moduleDir,
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
// Format: DD/MM/YYYY — matches formatDateDisplay across the app.
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

// ─── PDF drawing helpers ──────────────────────────────────────────────────────
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

/**
 * Shared dispatch for persisted consolidated documents.
 * Versioned batches always use their immutable page plan and saved settings.
 * Older unversioned records retain their historical renderer; when old
 * metadata is missing, preserve the caller's compatibility defaults.
 */
export async function generatePersistedConsolidatedInvoicePdf(
  batch: Record<string, any>,
  legacyDefaults: { includeNotes: boolean; lang: 'bm' | 'en' } = { includeNotes: false, lang: 'bm' }
): Promise<Buffer> {
  if ([2, 3].includes(batch.layoutVersion)) {
    return generateSavedInvoicePdf(batch as InvoiceBatch);
  }
  return generateServerConsolidatedInvoicePdf(
    batch.orders,
    batch.invoiceNo,
    typeof batch.includeNotes === 'boolean' ? batch.includeNotes : legacyDefaults.includeNotes,
    batch.lang === 'en' || batch.lang === 'bm' ? batch.lang : legacyDefaults.lang
  );
}

// ─── Master PDF Template Loader & Vector Engine ──────────────────────────────
let cachedMasterTemplateBytes: Uint8Array | null = null;

function loadAssetBuffer(relativePaths: string[]): Buffer | null {
  const cwd = process.cwd();
  const moduleDir = typeof __dirname === 'string' ? __dirname : cwd;
  const bases = [
    path.join(cwd, 'dist'),
    path.join(cwd, 'public'),
    cwd,
    path.join(moduleDir, '..', 'public'),
    path.join(moduleDir, '..', 'dist'),
    path.join(moduleDir, '..', '..', 'public'),
    path.join(moduleDir, '..', '..', 'dist'),
    path.join(moduleDir, 'public'),
    path.join(moduleDir, 'dist'),
    moduleDir,
  ];
  for (const relPath of relativePaths) {
    for (const base of bases) {
      const full = path.join(base, relPath);
      try {
        if (fs.existsSync(full)) {
          return fs.readFileSync(full);
        }
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

function getMasterTemplateBytes(): Uint8Array {
  if (!cachedMasterTemplateBytes) {
    const buf = loadAssetBuffer([
      'assets/invoices/Restoran_Wawasan_Template_Invois_Individu_Final.pdf',
    ]);
    if (!buf) {
      throw new Error(
        'Master individual invoice PDF template (Restoran_Wawasan_Template_Invois_Individu_Final.pdf) not found.'
      );
    }
    cachedMasterTemplateBytes = new Uint8Array(buf);
  }
  return cachedMasterTemplateBytes;
}

function sanitizePdfText(value: unknown): string {
  const normalized = String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\t+/g, ' ');
  let out = '';
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (code === 10 || code === 13 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
      out += normalized[i];
    }
  }
  return out;
}

function wrapPdfText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const clean = sanitizePdfText(text).trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
          current = word;
        } else {
          let chunk = '';
          for (const ch of word) {
            if (font.widthOfTextAtSize(chunk + ch, fontSize) <= maxWidth) {
              chunk += ch;
            } else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          current = chunk;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function addPageLink(
  pdfDoc: PDFDocument,
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  uri: string
): void {
  if (!uri) return;
  const annot = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [x, y, x + width, y + height],
    Border: [0, 0, 0],
    A: {
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(uri),
    },
  });
  page.node.addAnnot(pdfDoc.context.register(annot));
}

function drawRoundedRectPath(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor: ReturnType<typeof rgb>,
  borderColor?: ReturnType<typeof rgb>,
  borderWidth = 1
): void {
  const k = r * 0.5522847498;
  // Use top-left coordinate system for moveTo in drawSvgPath (yTop = pageHeight - yBottom)
  const pageH = page.getHeight();
  const top = pageH - (y + h);
  const pathStr = [
    `M ${x + r} ${top}`,
    `L ${x + w - r} ${top}`,
    `C ${x + w - r + k} ${top} ${x + w} ${top + r - k} ${x + w} ${top + r}`,
    `L ${x + w} ${top + h - r}`,
    `C ${x + w} ${top + h - r + k} ${x + w - r + k} ${top + h} ${x + w - r} ${top + h}`,
    `L ${x + r} ${top + h}`,
    `C ${x + r - k} ${top + h} ${x} ${top + h - r + k} ${x} ${top + h - r}`,
    `L ${x} ${top + r}`,
    `C ${x} ${top + r - k} ${x + r - k} ${top} ${x + r} ${top}`,
    'Z',
  ].join(' ');
  page.drawSvgPath(pathStr, {
    x: 0,
    y: pageH,
    color: fillColor,
    ...(borderColor ? { borderColor, borderWidth } : {}),
  });
}

function stripTemplateStreamToBrandHeader(rawStream: string): string {
  const dividerMarker = '42.5 713.8898 m 552.8 713.8898 l S';
  const regMarker = '(001759062-V) Tj T* ET';
  const regEnd = rawStream.indexOf(regMarker);
  const divIdx = rawStream.indexOf(dividerMarker);
  if (regEnd !== -1 && divIdx !== -1) {
    const headerPart = rawStream.slice(0, regEnd + regMarker.length);
    return `${headerPart}\n.6 .439216 .117647 RG\n1.1 w\nn ${dividerMarker}\n`;
  }
  return rawStream;
}

function drawMasterRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>
): void {
  const safe = sanitizePdfText(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, {
    x: rightX - width,
    y,
    font,
    size,
    color,
  });
}

function resolveDocumentType(
  order: Record<string, any>,
  isFinal: boolean,
  docTypeOverride?: ServerPdfDocumentType
): ServerPdfDocumentType {
  if (docTypeOverride) return docTypeOverride;
  const status = String(order.status || '').toLowerCase().trim();
  const inv = String(order.invoiceNo || '').trim();
  if (
    !isFinal ||
    (!Number(order.totalAmount) && inv.startsWith('QT')) ||
    ['pending', 'rejected', 'cancelled'].includes(status)
  ) {
    return 'quotation';
  }
  return 'invoice';
}

interface TableRowItem {
  dateText: string;
  descriptionTitle: string;
  descriptionLines: string[];
  mealText: string;
  paxText: string;
  rateText: string;
  amountText: string;
  rowHeight: number;
}

const C_ESPRESSO = rgb(0.160784, 0.101961, 0.090196);
const C_MUTED_DARK = rgb(0.137255, 0.109804, 0.098039);
const C_GOLD_LABEL = rgb(0.6, 0.439216, 0.117647);
const C_GOLD_RULE = rgb(0.886275, 0.843137, 0.760784);
const C_CARD_CREAM = rgb(0.976471, 0.960784, 0.929412);
const C_ROW_CREAM = rgb(0.984314, 0.976471, 0.960784);
const C_WHITE = rgb(1, 1, 1);
const C_FOOTER_GRAY = rgb(0.423529, 0.4, 0.376471);
const C_TOTAL_RULE = rgb(0.85098, 0.784314, 0.72549);

function drawHeaderMetaRight(
  page: PDFPage,
  docType: ServerPdfDocumentType,
  lang: 'en' | 'bm',
  docNumber: string,
  docDate: string,
  fonts: { regular: PDFFont; bold: PDFFont }
): void {
  const title =
    docType === 'quotation'
      ? lang === 'en'
        ? 'QUOTATION'
        : 'SEBUT HARGA'
      : lang === 'en'
        ? 'INVOICE'
        : 'INVOIS';

  drawMasterRightText(page, title, 542.8, 787.89, fonts.bold, 16, C_ESPRESSO);

  const numLabel =
    docType === 'quotation'
      ? lang === 'en'
        ? 'Quotation No.:'
        : 'No. Sebut Harga:'
      : lang === 'en'
        ? 'Invoice No.:'
        : 'No. Invois:';

  const ruleStartX = Math.min(480, 542.8 - Math.max(66, fonts.bold.widthOfTextAtSize(sanitizePdfText(docNumber), 8.2) + 6));
  drawMasterRightText(page, numLabel, ruleStartX - 4, 769.79, fonts.regular, 7.6, C_ESPRESSO);
  page.drawLine({
    start: { x: ruleStartX, y: 766.39 },
    end: { x: 542.8, y: 766.39 },
    thickness: 0.55,
    color: C_GOLD_RULE,
  });
  let numFontSize = 8.2;
  const maxNumWidth = 542.8 - ruleStartX - 2;
  while (numFontSize > 6.5 && fonts.bold.widthOfTextAtSize(sanitizePdfText(docNumber), numFontSize) > maxNumWidth) {
    numFontSize -= 0.3;
  }
  drawMasterRightText(page, docNumber, 542.0, 769.2, fonts.bold, numFontSize, C_ESPRESSO);

  const dateLabel = lang === 'en' ? 'Date:' : 'Tarikh:';
  drawMasterRightText(page, dateLabel, 493, 754.29, fonts.regular, 7.6, C_ESPRESSO);
  page.drawLine({
    start: { x: 497, y: 751.09 },
    end: { x: 542.8, y: 751.09 },
    thickness: 0.55,
    color: C_GOLD_RULE,
  });
  drawMasterRightText(page, docDate, 542.0, 753.7, fonts.bold, 7.8, C_ESPRESSO);
}

function drawTableHeaderBar(
  page: PDFPage,
  topY: number,
  lang: 'en' | 'bm',
  boldFont: PDFFont
): void {
  const bottomY = topY - 25;
  drawRoundedRectPath(page, 42.5, bottomY, 510.3, 25, 4, C_ESPRESSO);
  const labelY = bottomY + 8.3;
  const headers =
    lang === 'en'
      ? {
          date: 'DATE',
          menu: 'DESCRIPTION / MENU',
          meal: 'MEAL',
          pax: 'PAX',
          rate: 'RM/PAX',
          total: 'AMOUNT (RM)',
        }
      : {
          date: 'TARIKH',
          menu: 'MENU / PERIHAL',
          meal: 'HIDANGAN',
          pax: 'PAX',
          rate: 'RM/PAX',
          total: 'JUMLAH (RM)',
        };
  page.drawText(headers.date, { x: 52.5, y: labelY, font: boldFont, size: 7.3, color: C_WHITE });
  page.drawText(headers.menu, { x: 115.5, y: labelY, font: boldFont, size: 7.3, color: C_WHITE });
  page.drawText(headers.meal, { x: 320.5, y: labelY, font: boldFont, size: 7.3, color: C_WHITE });
  page.drawText(headers.pax, { x: 406.5, y: labelY, font: boldFont, size: 7.3, color: C_WHITE });
  page.drawText(headers.rate, { x: 450.5, y: labelY, font: boldFont, size: 7.3, color: C_WHITE });
  drawMasterRightText(page, headers.total, 545, labelY, boldFont, 7.3, C_WHITE);
}

function drawTableRowBand(
  page: PDFPage,
  row: TableRowItem | null,
  topY: number,
  rowHeight: number,
  index: number,
  fonts: { regular: PDFFont; bold: PDFFont; oblique: PDFFont },
  isQuoteOrPending: boolean
): void {
  const bottomY = topY - rowHeight;
  const bg = index % 2 === 0 ? C_ROW_CREAM : C_WHITE;
  page.drawRectangle({
    x: 42.5,
    y: bottomY,
    width: 510.3,
    height: rowHeight,
    color: bg,
  });
  page.drawLine({
    start: { x: 42.5, y: bottomY },
    end: { x: 552.8, y: bottomY },
    thickness: 0.5,
    color: C_GOLD_RULE,
  });

  if (!row) return;

  const firstBaselineY = topY - 11.2;
  if (row.dateText) {
    page.drawText(sanitizePdfText(row.dateText), {
      x: 52.5,
      y: firstBaselineY,
      font: fonts.regular,
      size: 7.8,
      color: C_ESPRESSO,
    });
  }

  page.drawText(sanitizePdfText(row.descriptionTitle), {
    x: 115.5,
    y: firstBaselineY,
    font: fonts.bold,
    size: 8.1,
    color: C_ESPRESSO,
  });

  row.descriptionLines.forEach((line, idx) => {
    page.drawText(sanitizePdfText(line), {
      x: 115.5,
      y: firstBaselineY - 10.2 * (idx + 1),
      font: fonts.regular,
      size: 7.4,
      color: C_FOOTER_GRAY,
    });
  });

  if (row.mealText) {
    const mealLines = wrapPdfText(row.mealText, fonts.regular, 7.8, 76);
    mealLines.slice(0, 2).forEach((line, idx) => {
      page.drawText(line, {
        x: 320.5,
        y: firstBaselineY - idx * 9.5,
        font: fonts.regular,
        size: 7.8,
        color: C_ESPRESSO,
      });
    });
  }

  page.drawText(sanitizePdfText(row.paxText), {
    x: 408.5,
    y: firstBaselineY,
    font: fonts.regular,
    size: 8.0,
    color: C_ESPRESSO,
  });

  if (row.rateText) {
    page.drawText(sanitizePdfText(row.rateText), {
      x: 452.0,
      y: firstBaselineY,
      font: isQuoteOrPending ? fonts.oblique : fonts.regular,
      size: isQuoteOrPending ? 7.4 : 8.0,
      color: isQuoteOrPending ? C_GOLD_LABEL : C_ESPRESSO,
    });
  }

  drawMasterRightText(
    page,
    row.amountText,
    545.0,
    firstBaselineY,
    isQuoteOrPending ? fonts.oblique : fonts.bold,
    isQuoteOrPending ? 7.5 : 8.2,
    isQuoteOrPending ? C_GOLD_LABEL : C_ESPRESSO
  );
}

function drawFooterBar(
  pdfDoc: PDFDocument,
  page: PDFPage,
  pageNumber: number,
  totalPages: number,
  lang: 'en' | 'bm',
  regularFont: PDFFont
): void {
  page.drawLine({
    start: { x: 42.5, y: 45.99 },
    end: { x: 552.8, y: 45.99 },
    thickness: 0.6,
    color: C_GOLD_RULE,
  });

  const phoneText = INVOICE_CONTACT.phone;
  const sepText = '   |   ';
  const emailText = INVOICE_CONTACT.email;
  page.drawText(`${phoneText}${sepText}${emailText}`, {
    x: 42.5,
    y: 31.39,
    font: regularFont,
    size: 7.4,
    color: C_FOOTER_GRAY,
  });

  const phoneW = regularFont.widthOfTextAtSize(phoneText, 7.4);
  const sepW = regularFont.widthOfTextAtSize(sepText, 7.4);
  const emailW = regularFont.widthOfTextAtSize(emailText, 7.4);
  addPageLink(pdfDoc, page, 42.5, 27, phoneW, 12, INVOICE_CONTACT.whatsapp);
  addPageLink(pdfDoc, page, 42.5 + phoneW + sepW, 27, emailW, 12, `mailto:${INVOICE_CONTACT.email}`);

  const pageLabel =
    lang === 'en' ? `Page ${pageNumber} / ${totalPages}` : `Halaman ${pageNumber} / ${totalPages}`;
  drawMasterRightText(page, pageLabel, 552.8, 31.39, regularFont, 7.4, C_FOOTER_GRAY);
}

function drawFooterNotice(
  page: PDFPage,
  docType: ServerPdfDocumentType,
  lang: 'en' | 'bm',
  font: PDFFont
): void {
  const notice =
    docType === 'invoice'
      ? 'This is a computer-generated invoice. No company stamp is required.'
      : lang === 'bm'
        ? 'Ini adalah sebut harga janaan komputer. Tiada cop syarikat diperlukan.'
        : 'This is a computer-generated quotation. No company stamp is required.';
  const noticeWidth = font.widthOfTextAtSize(notice, 8.5);
  page.drawText(notice, {
    x: (page.getWidth() - noticeWidth) / 2,
    y: 53.8898,
    font,
    size: 8.5,
    color: rgb(0.4, 0.4, 0.4),
  });
}

export async function generateServerInvoicePdf(
  order: Record<string, any>,
  isFinal: boolean,
  docTypeOverride?: ServerPdfDocumentType
): Promise<Buffer> {
  const lang: 'en' | 'bm' = order.lang === 'en' ? 'en' : 'bm';
  const docType = resolveDocumentType(order, isFinal, docTypeOverride);
  const isMonetaryFinal = isFinal && docType !== 'quotation';
  const { bankName, bankAccountName, bankAccountNumber } = getBankDetails();

  const masterBytes = getMasterTemplateBytes();
  const pdfDoc = await PDFDocument.load(masterBytes);

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const docNumber =
    docType === 'quotation'
      ? String(order.quoteNo || order.invoiceNo || (lang === 'en' ? 'QUOTATION' : 'SEBUT HARGA'))
      : String(order.invoiceNo || order.officialInvoiceNo || (isFinal ? 'PENDING' : lang === 'en' ? 'QUOTATION' : 'SEBUT HARGA'));

  const docDate = isMonetaryFinal && (order.billedAt || order.approvedAt || order.issuedAt)
    ? formatDate(String(order.billedAt || order.approvedAt || order.issuedAt))
    : formatDate(new Date().toISOString());
  const eventDateText = formatDate(order.eventDate || order.date || order.dateTime);

  const recipientPrimary = String(
    order.to || order.company || order.name || (lang === 'en' ? 'Valued Customer' : 'Pelanggan Dihormati')
  );
  const rawDept = String(order.department || order.division || '').trim();
  const rawBilling = String(order.billingAddress || '').trim();
  const rawAttn = String(order.attn || '').trim();

  const billParts: string[] = [recipientPrimary];
  if (rawDept && rawDept.toLowerCase() !== recipientPrimary.toLowerCase()) {
    billParts.push(rawDept);
  }
  if (rawBilling && rawBilling.toLowerCase() !== recipientPrimary.toLowerCase()) {
    billParts.push(rawBilling);
  }
  if (rawAttn && rawAttn.toLowerCase() !== recipientPrimary.toLowerCase()) {
    billParts.push(`Attn: ${rawAttn}`);
  }

  const billLines: string[] = [];
  billParts.forEach((part, idx) => {
    const f = idx === 0 ? helveticaBold : helvetica;
    const sz = idx === 0 ? 8.6 : 8.1;
    billLines.push(...wrapPdfText(part, f, sz, 322));
  });

  const extraBillLines = Math.max(0, billLines.length - 3);
  const extraBillH = extraBillLines * 13;

  const locationVal = String(
    order.location ||
      (lang === 'en'
        ? 'Restoran Wawasan (Dine-in / Pickup)'
        : 'Restoran Wawasan (Makan di Restoran / Ambil Sendiri)')
  );
  const locationLines = wrapPdfText(locationVal, helveticaBold, 8.2, 508);
  const extraLocLines = Math.max(0, locationLines.length - 1);
  const extraLocH = extraLocLines * 12.5;
  const totalUpperShift = extraBillH + extraLocH;

  const verifiedCode = getVerifiedOrderCompanyCode({
    to: String(order.to || order.company || ''),
    company: String(order.company || ''),
    companyCode: typeof order.companyCode === 'string' ? order.companyCode : undefined,
  });
  const subjectCode = verifiedCode || '-';

  const quantity = Number(order.quantity || order.guests || order.pax || 0);
  const meals: string[] =
    Array.isArray(order.meals) && order.meals.length > 0
      ? order.meals
      : order.meals
        ? [String(order.meals)]
        : ['default'];
  const prices: Record<string, number> = order.prices || {};

  const dishList = Array.isArray(order.dishes)
    ? order.dishes
        .map((d: any) =>
          typeof d === 'string'
            ? d
            : lang === 'bm'
              ? d?.nameBm || d?.nameEn || ''
              : d?.nameEn || d?.nameBm || ''
        )
        .filter(Boolean)
    : [];
  const rawMenu = String(order.menu || '').trim();
  const fullMenuText = rawMenu || (dishList.length > 0 ? dishList.join(', ') : '');

  let computedSubtotal = 0;
  const rows: TableRowItem[] = meals.map((meal, idx) => {
    const rawLabel = mealLabels[meal] || meal;
    const shortMeal =
      meal === 'default'
        ? lang === 'en'
          ? 'Catering'
          : 'Katering'
        : lang === 'en'
          ? rawLabel.split(' / ')[1] || rawLabel
          : rawLabel.split(' / ')[0] || rawLabel;

    const priceVal = Number(prices[meal] ?? prices['default'] ?? 0);
    const subtotal = priceVal * quantity;
    if (isMonetaryFinal) computedSubtotal += subtotal;

    let descLines: string[] = [];
    if (idx === 0 && fullMenuText) {
      descLines = wrapPdfText(fullMenuText, helvetica, 7.4, 196);
    }
    const rowHeight = Math.max(23, 14 + descLines.length * 10.2);

    return {
      dateText: idx === 0 ? eventDateText : '',
      descriptionTitle:
        idx === 0 && fullMenuText
          ? shortMeal
          : `${shortMeal}${order.preparationType === 'buffet' ? ' (Bufet)' : ''}`,
      descriptionLines: descLines,
      mealText: shortMeal,
      paxText: String(quantity || '-'),
      rateText: isMonetaryFinal && priceVal >= 0 ? priceVal.toFixed(2) : lang === 'bm' ? 'Menunggu' : 'Pending',
      amountText:
        isMonetaryFinal && priceVal >= 0
          ? subtotal.toFixed(2)
          : lang === 'bm'
            ? 'Sebut harga'
            : 'Quotation',
      rowHeight,
    };
  });

  if (isMonetaryFinal) {
    const deliveryCharge = Number(order.deliveryCharge ?? 0);
    if (Number.isFinite(deliveryCharge) && deliveryCharge > 0) {
      computedSubtotal += deliveryCharge;
      rows.push({
        dateText: '',
        descriptionTitle: lang === 'bm' ? 'Caj Penghantaran' : 'Delivery Charge',
        descriptionLines: [],
        mealText: '-',
        paxText: '-',
        rateText: '-',
        amountText: deliveryCharge.toFixed(2),
        rowHeight: 23,
      });
    }
    const serviceChargeAmount = Number(order.serviceChargeAmount ?? 0);
    if (Number.isFinite(serviceChargeAmount) && serviceChargeAmount > 0) {
      computedSubtotal += serviceChargeAmount;
      rows.push({
        dateText: '',
        descriptionTitle: lang === 'bm' ? 'Caj Perkhidmatan' : 'Service Charge',
        descriptionLines: [],
        mealText: '-',
        paxText: '-',
        rateText: '-',
        amountText: serviceChargeAmount.toFixed(2),
        rowHeight: 23,
      });
    }
  }

  let grandTotal = computedSubtotal;
  if (
    isMonetaryFinal &&
    order.totalAmount != null &&
    Number.isFinite(Number(order.totalAmount)) &&
    Number(order.totalAmount) >= 0
  ) {
    grandTotal = Math.round(Number(order.totalAmount) * 100) / 100;
  }

  // Paginate rows across pages while keeping the final totals/payment/signature block intact.
  // Master summary block occupies y <= 435.89 on the final page, with ~75pt safe bottom slack
  // above the notice (y: 53.89) so 4-6 row single-page orders fit cleanly on Page 1.
  const page1TableTopY = 539.89 - totalUpperShift;
  const contTableTopY = 672.0;
  const finalPageMinRowBottom = 435.89;
  const maxShiftedFinalRowBottom = 360.89;
  const nonFinalMinRowBottom = 76.0;

  interface PagePlan {
    isFirst: boolean;
    isFinalSummary: boolean;
    summaryShift: number;
    tableHeaderTopY: number;
    tableTopY: number;
    rows: TableRowItem[];
  }

  const pagePlans: PagePlan[] = [];
  let cursor = 0;

  while (cursor < rows.length || pagePlans.length === 0) {
    const isFirst = pagePlans.length === 0;
    const headerTopY = isFirst ? page1TableTopY + 25 : contTableTopY + 25;
    const topY = isFirst ? page1TableTopY : contTableTopY;

    // Check if ALL remaining rows fit on this final summary page (within safe shift down to 360.89)
    const remainingHeight = rows
      .slice(cursor)
      .reduce((sum, r) => sum + r.rowHeight, 0);
    const tableEndY = topY - remainingHeight;

    if (tableEndY >= maxShiftedFinalRowBottom) {
      const summaryShift = tableEndY < finalPageMinRowBottom ? finalPageMinRowBottom - tableEndY : 0;
      pagePlans.push({
        isFirst,
        isFinalSummary: true,
        summaryShift,
        tableHeaderTopY: headerTopY,
        tableTopY: topY,
        rows: rows.slice(cursor),
      });
      cursor = rows.length;
    } else {
      // Fill up to nonFinalMinRowBottom on this continuation page
      let currentY = topY;
      const pageRows: TableRowItem[] = [];
      while (cursor < rows.length && currentY - rows[cursor].rowHeight >= nonFinalMinRowBottom) {
        pageRows.push(rows[cursor]);
        currentY -= rows[cursor].rowHeight;
        cursor++;
      }
      if (pageRows.length === 0 && cursor < rows.length) {
        pageRows.push(rows[cursor]);
        cursor++;
      }
      pagePlans.push({
        isFirst,
        isFinalSummary: false,
        summaryShift: 0,
        tableHeaderTopY: headerTopY,
        tableTopY: topY,
        rows: pageRows,
      });
      if (cursor >= rows.length) {
        // Remaining summary block needs its own clean final summary page
        pagePlans.push({
          isFirst: false,
          isFinalSummary: true,
          summaryShift: 0,
          tableHeaderTopY: contTableTopY + 25,
          tableTopY: contTableTopY,
          rows: [],
        });
      }
    }
  }

  // Clone template pages as needed BEFORE mutating page 0 streams so resources (/FormXob*, /fzImg0) remain intact
  const templatePage = pdfDoc.getPage(0);
  const templateContents = templatePage.node.Contents();
  const templateStreamRefs =
    templateContents instanceof PDFArray ? templateContents.asArray() : [templateContents];
  const rawStream1 =
    templateStreamRefs[1] && pdfDoc.context.lookup(templateStreamRefs[1]) instanceof PDFRawStream
      ? Buffer.from(
          decodePDFRawStream(pdfDoc.context.lookup(templateStreamRefs[1]) as PDFRawStream).decode()
        ).toString('latin1')
      : '';
  const strippedBrandHeaderStream = stripTemplateStreamToBrandHeader(rawStream1);
  const rawSignatureStream =
    templateStreamRefs[3] && pdfDoc.context.lookup(templateStreamRefs[3]) instanceof PDFRawStream
      ? Buffer.from(
          decodePDFRawStream(pdfDoc.context.lookup(templateStreamRefs[3]) as PDFRawStream).decode()
        ).toString('latin1')
      : '';

  for (let i = 1; i < pagePlans.length; i++) {
    const [copied] = await pdfDoc.copyPages(pdfDoc, [0]);
    pdfDoc.addPage(copied);
  }

  const totalPages = pagePlans.length;
  const picName = String(
    order.name || order.customerName || order.picName || order.pocName || order.contactName || '-'
  );
  const picPhone = String(
    order.contact || order.phone || order.picPhone || order.pocPhone || order.contactNumber || '-'
  );
  const picEmail = String(
    order.email || order.customerEmail || order.picEmail || order.pocEmail || '-'
  );

  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const page = pdfDoc.getPage(pIdx);
    const plan = pagePlans[pIdx];

    // Rewrite page content array: keep Stream 0 (`q`), trimmed Stream 1 (Jawi+Logo+Address+GoldDivider),
    // Stream 2 (`Q`), and keep Stream 3 (`/fzImg0 Do` signature) + Stream 4 (notice) ONLY on final summary page!
    const existingContents = page.node.Contents();
    const refs =
      existingContents instanceof PDFArray ? existingContents.asArray() : [existingContents];
    const headerOnlyRef = pdfDoc.context.register(
      pdfDoc.context.flateStream(strippedBrandHeaderStream)
    );
    const newContentsRefs = [refs[0], headerOnlyRef, refs[2]];
    if (plan.isFinalSummary) {
      if (plan.summaryShift > 0 && rawSignatureStream) {
        const shiftedSigStream = `q\n1 0 0 1 0 -${plan.summaryShift.toFixed(4)} cm\n${rawSignatureStream}\nQ\n`;
        newContentsRefs.push(
          pdfDoc.context.register(pdfDoc.context.flateStream(shiftedSigStream))
        );
      } else if (refs[3]) {
        newContentsRefs.push(refs[3]);
      }

    }
    page.node.set(
      page.node.context.obj('Contents'),
      pdfDoc.context.obj(newContentsRefs)
    );

    // Clickable link on header Restoran Wawasan address -> Google Maps
    addPageLink(pdfDoc, page, 121.5, 742, 220, 56, INVOICE_CONTACT.maps);

    // Top-right document metadata (Title, Document No, Issue Date)
    drawHeaderMetaRight(page, docType, lang, docNumber, docDate, {
      regular: helvetica,
      bold: helveticaBold,
    });

    if (plan.isFirst) {
      // Upper Cream Card: KEPADA / BILL TO | TARIKH ACARA | SUBJECT
      const cardBottomY = 608.89 - extraBillH;
      const cardTopY = 699.89;
      drawRoundedRectPath(
        page,
        42.5,
        cardBottomY,
        510.3,
        cardTopY - cardBottomY,
        6,
        C_CARD_CREAM
      );

      page.drawText('KEPADA / BILL TO', {
        x: 55.5,
        y: 683.69,
        font: helveticaBold,
        size: 7.7,
        color: C_GOLD_LABEL,
      });

      const billRuleCount = Math.max(3, billLines.length);
      for (let i = 0; i < billRuleCount; i++) {
        const ruleY =
          i === 0 ? 663.89 : i === 1 ? 645.39 : 627.39 - (i - 2) * 13;
        page.drawLine({
          start: { x: 55.5, y: ruleY },
          end: { x: 380.5, y: ruleY },
          thickness: 0.55,
          color: C_GOLD_RULE,
        });
        if (billLines[i]) {
          page.drawText(sanitizePdfText(billLines[i]), {
            x: 55.5,
            y: ruleY + 2.8,
            font: i === 0 ? helveticaBold : helvetica,
            size: i === 0 ? 8.6 : 8.1,
            color: C_ESPRESSO,
          });
        }
      }

      // TARIKH ACARA / EVENT DATE
      page.drawText(lang === 'en' ? 'EVENT DATE' : 'TARIKH ACARA', {
        x: 414.8,
        y: 683.69,
        font: helveticaBold,
        size: 7.7,
        color: C_GOLD_LABEL,
      });
      page.drawLine({
        start: { x: 414.8, y: 660.89 },
        end: { x: 526.8, y: 660.89 },
        thickness: 0.55,
        color: C_GOLD_RULE,
      });
      page.drawText(sanitizePdfText(eventDateText), {
        x: 414.8,
        y: 663.9,
        font: helveticaBold,
        size: 8.4,
        color: C_ESPRESSO,
      });

      // SUBJECT (4-character PETRONAS Company Code or '-')
      page.drawText('SUBJECT', {
        x: 414.8,
        y: 646.69,
        font: helveticaBold,
        size: 7.7,
        color: C_GOLD_LABEL,
      });
      page.drawLine({
        start: { x: 414.8, y: 623.39 },
        end: { x: 526.8, y: 623.39 },
        thickness: 0.55,
        color: C_GOLD_RULE,
      });
      page.drawText(sanitizePdfText(subjectCode), {
        x: 414.8,
        y: 626.4,
        font: helveticaBold,
        size: 8.6,
        color: C_ESPRESSO,
      });

      // LOKASI ACARA / EVENT LOCATION
      const locLabelY = 594.69 - extraBillH;
      const locFirstTextY = 581.0 - extraBillH;
      const locRuleY = 578.19 - extraBillH - extraLocH;
      page.drawText(lang === 'en' ? 'EVENT LOCATION' : 'LOKASI ACARA', {
        x: 42.5,
        y: locLabelY,
        font: helveticaBold,
        size: 7.7,
        color: C_GOLD_LABEL,
      });
      locationLines.forEach((line, idx) => {
        page.drawText(sanitizePdfText(line), {
          x: 42.5,
          y: locFirstTextY - idx * 12.5,
          font: helveticaBold,
          size: 8.2,
          color: C_ESPRESSO,
        });
      });
      page.drawLine({
        start: { x: 42.5, y: locRuleY },
        end: { x: 552.8, y: locRuleY },
        thickness: 0.55,
        color: C_GOLD_RULE,
      });
      if (order.location) {
        addPageLink(
          pdfDoc,
          page,
          42.5,
          locRuleY - 2,
          510.3,
          20 + extraLocH,
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationVal)}`
        );
      }
    }

    // Table Header + Rows (for non-empty table or Page 1)
    if (plan.rows.length > 0 || plan.isFirst) {
      drawTableHeaderBar(page, plan.tableHeaderTopY, lang, helveticaBold);
      let rowTopY = plan.tableTopY;
      plan.rows.forEach((row, idx) => {
        drawTableRowBand(
          page,
          row,
          rowTopY,
          row.rowHeight,
          idx,
          { regular: helvetica, bold: helveticaBold, oblique: helveticaOblique },
          !isMonetaryFinal
        );
        rowTopY -= row.rowHeight;
      });
      // Pad Page 1 up to 4 bands to maintain master single-page visual grid when < 4 rows
      if (plan.isFirst && plan.isFinalSummary && plan.summaryShift === 0) {
        let idx = plan.rows.length;
        while (rowTopY - 26 >= finalPageMinRowBottom - 0.5) {
          drawTableRowBand(
            page,
            null,
            rowTopY,
            26,
            idx,
            { regular: helvetica, bold: helveticaBold, oblique: helveticaOblique },
            !isMonetaryFinal
          );
          rowTopY -= 26;
          idx++;
        }
      }
    }

    // Final Summary Block (Totals Bar, Amount in Words, Bank Card, Contact, Signature label/line)
    if (plan.isFinalSummary) {
      const sy = (y: number) => y - plan.summaryShift;

      // Total Bar: y: 405.89..435.89
      page.drawRectangle({
        x: 42.5,
        y: sy(405.89),
        width: 510.3,
        height: 30,
        color: C_ESPRESSO,
      });
      page.drawText(lang === 'en' ? 'GRAND TOTAL' : 'JUMLAH KESELURUHAN', {
        x: 54.5,
        y: sy(419.49),
        font: helveticaBold,
        size: 9.3,
        color: C_WHITE,
      });
      page.drawText('RM', {
        x: 446.9875,
        y: sy(415.19),
        font: helveticaBold,
        size: 12.5,
        color: C_WHITE,
      });
      page.drawLine({
        start: { x: 488, y: sy(413.89) },
        end: { x: 543, y: sy(413.89) },
        thickness: 0.6,
        color: C_TOTAL_RULE,
      });
      const totalStr = isMonetaryFinal
        ? grandTotal.toFixed(2)
        : lang === 'bm'
          ? 'Sebut harga'
          : 'Quotation';
      drawMasterRightText(
        page,
        totalStr,
        543.0,
        sy(416.2),
        isMonetaryFinal ? helveticaBold : helveticaOblique,
        isMonetaryFinal ? 12.0 : 9.0,
        C_WHITE
      );

      // Amount in Words (y: 389.49)
      page.drawText('RINGGIT MALAYSIA:', {
        x: 49.5,
        y: sy(389.49),
        font: helveticaBold,
        size: 9.4,
        color: C_MUTED_DARK,
      });
      page.drawLine({
        start: { x: 153, y: sy(386.89) },
        end: { x: 481, y: sy(386.89) },
        thickness: 0.55,
        color: C_GOLD_RULE,
      });
      page.drawText(lang === 'en' ? 'ONLY.' : 'SAHAJA.', {
        x: 488,
        y: sy(389.49),
        font: helveticaBold,
        size: 9.4,
        color: C_MUTED_DARK,
      });
      if (isMonetaryFinal) {
        const spelled = (lang === 'en' ? enWords(grandTotal) : bmWords(grandTotal)).toUpperCase();
        let wordSize = 8.4;
        const maxWordW = 324;
        while (wordSize > 6.2 && helveticaBold.widthOfTextAtSize(spelled, wordSize) > maxWordW) {
          wordSize -= 0.3;
        }
        if (helveticaBold.widthOfTextAtSize(spelled, wordSize) <= maxWordW) {
          page.drawText(spelled, {
            x: 156,
            y: sy(389.49),
            font: helveticaBold,
            size: wordSize,
            color: C_MUTED_DARK,
          });
        } else {
          const wordLines = wrapPdfText(spelled, helveticaBold, 7.2, maxWordW);
          wordLines.slice(0, 2).forEach((ln, idx) => {
            page.drawText(ln, {
              x: 156,
              y: sy(393.5) - idx * 8.5,
              font: helveticaBold,
              size: 7.2,
              color: C_MUTED_DARK,
            });
          });
        }
      }

      // Bank Details Box (y: 263.89..336.89)
      drawRoundedRectPath(
        page,
        42.5,
        sy(263.89),
        510.3,
        73.0,
        6,
        C_CARD_CREAM,
        C_GOLD_RULE,
        1
      );
      page.drawText(
        lang === 'en' ? 'PAYMENT DETAILS' : 'MAKLUMAT PEMBAYARAN / PAYMENT DETAILS',
        { x: 54.5, y: sy(321.69), font: helveticaBold, size: 7.7, color: C_GOLD_LABEL }
      );
      page.drawText(lang === 'en' ? 'ACCOUNT NAME' : 'NAMA AKAUN', {
        x: 55.5,
        y: sy(304.79),
        font: helveticaBold,
        size: 7.7,
        color: C_GOLD_LABEL,
      });
      page.drawText('BANK', {
        x: 246.5,
        y: sy(304.79),
        font: helveticaBold,
        size: 7.7,
        color: C_GOLD_LABEL,
      });
      page.drawText(lang === 'en' ? 'ACCOUNT NO.' : 'NO. AKAUN', {
        x: 384.5,
        y: sy(304.79),
        font: helveticaBold,
        size: 7.7,
        color: C_GOLD_LABEL,
      });
      page.drawText(sanitizePdfText(bankAccountName), {
        x: 55.5,
        y: sy(287.64),
        font: helveticaBold,
        size: 9.25,
        color: C_ESPRESSO,
      });
      page.drawText(sanitizePdfText(bankName), {
        x: 246.5,
        y: sy(287.64),
        font: helveticaBold,
        size: 9.25,
        color: C_ESPRESSO,
      });
      page.drawText(sanitizePdfText(bankAccountNumber), {
        x: 384.5,
        y: sy(287.64),
        font: helveticaBold,
        size: 9.25,
        color: C_ESPRESSO,
      });
      page.drawText(
        docType === 'quotation'
          ? lang === 'en'
            ? 'Quotation issued by Restoran Wawasan. Final invoice will be issued upon confirmation.'
            : 'Sebut harga dikeluarkan oleh Restoran Wawasan. Invois rasmi akan dikeluarkan selepas pengesahan.'
          : lang === 'en'
            ? 'Please use the invoice number as your transaction reference.'
            : 'Sila gunakan nombor invois sebagai rujukan pembayaran.',
        { x: 55.5, y: sy(273.39), font: helveticaOblique, size: 7.5, color: C_FOOTER_GRAY }
      );

      // Bottom Left Contact Section (42.5..302.5)
      page.drawText('PEGAWAI DIHUBUNGI / CONTACT', {
        x: 42.5,
        y: sy(242.19),
        font: helveticaBold,
        size: 7.7,
        color: C_GOLD_LABEL,
      });
      const contactRows = [
        { yRule: sy(223.39), val: picName },
        { yRule: sy(209.89), val: picPhone },
        { yRule: sy(195.89), val: picEmail },
      ];
      contactRows.forEach(({ yRule, val }, idx) => {
        page.drawLine({
          start: { x: 42.5, y: yRule },
          end: { x: 302.5, y: yRule },
          thickness: 0.55,
          color: C_GOLD_RULE,
        });
        const cleanVal = sanitizePdfText(val);
        page.drawText(cleanVal.slice(0, 62), {
          x: 42.5,
          y: yRule + 2.5,
          font: idx === 0 ? helveticaBold : helvetica,
          size: 8.1,
          color: C_ESPRESSO,
        });
      });
      if (picPhone && picPhone !== '-') {
        addPageLink(
          pdfDoc,
          page,
          42.5,
          sy(209.5),
          260,
          12,
          `https://wa.me/${picPhone.replace(/\D/g, '').replace(/^0/, '60')}`
        );
      }
      if (picEmail && picEmail !== '-' && picEmail.includes('@')) {
        addPageLink(pdfDoc, page, 42.5, sy(195.5), 260, 12, `mailto:${encodeURIComponent(picEmail)}`);
      }

      // Bottom Right Signature Block (Embedded /fzImg0 is preserved in Stream 3!)
      page.drawText(lang === 'en' ? 'AUTHORIZED BY' : 'DISAHKAN OLEH', {
        x: 380,
        y: sy(242.39),
        font: helveticaBold,
        size: 7.7,
        color: C_GOLD_LABEL,
      });
      page.drawLine({
        start: { x: 376, y: sy(179.89) },
        end: { x: 534.8, y: sy(179.89) },
        thickness: 0.55,
        color: C_GOLD_RULE,
      });
      page.drawText('Restoran Wawasan', {
        x: 419.62,
        y: sy(165.49),
        font: helveticaBold,
        size: 8.2,
        color: C_ESPRESSO,
      });
    }

    if (plan.isFinalSummary) drawFooterNotice(page, docType, lang, helveticaOblique);
    drawFooterBar(pdfDoc, page, pIdx + 1, totalPages, lang, helvetica);
  }

  const outBytes = await pdfDoc.save();
  return Buffer.from(outBytes);
}

function drawCreamBox(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  boldValue = false
) {
  doc.setFillColor(253, 252, 250);
  doc.setDrawColor(194, 147, 45);
  doc.setLineWidth(0.35);
  doc.rect(x, y, width, height, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(114, 80, 20);
  doc.text(label, x + 3, y + 4.8);

  doc.setFont('helvetica', boldValue ? 'bold' : 'normal');
  doc.setFontSize(9);
  doc.setTextColor(26, 24, 22);
  const split = doc.splitTextToSize(value || '-', width - 6);
  doc.text(split[0] || '-', x + 3, y + 10);
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
