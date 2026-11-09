import { INVOICE_BUSINESS } from '../constants/invoiceBusiness';
import { jsPDF } from 'jspdf';
import {
  invoiceAmountCents,
  invoiceDate,
  type InvoiceRecord,
  type InvoicePage,
  type InvoiceRecipient,
} from '../lib/invoiceBatch';
import {
  drawInvoiceBankDetails,
  drawInvoiceCalligraphy,
  drawInvoiceContactLinks,
  INVOICE_CONTACT,
} from './invoicePdfBrand';
import { numberToWords } from './numberToWordsBM';
export interface BatchPdfOptions {
  includeNotes: boolean;
  lang: 'bm' | 'en';
  recipient: InvoiceRecipient;
  issuedAt: string;
  pages?: InvoicePage[];
  logo?: string | null;
  calligraphy?: string | null;
  bank?: { bankName: string; bankAccountName: string; bankAccountNumber: string };
}
const MEALS: Record<string, [string, string]> = {
  breakfast: ['Sarapan', 'Breakfast'],
  lunch: ['Tengah hari', 'Lunch'],
  tea_break: ['Rehat', 'Tea break'],
  hi_tea: ['Minum petang', 'Hi-tea'],
  hi_tea_break: ['Minum petang', 'Hi-tea'],
  dinner: ['Malam', 'Dinner'],
};
const rowsBottom = 157,
  lineHeight = 3.8;
function layout(doc: jsPDF, orders: InvoiceRecord[], options: BatchPdfOptions) {
  const activeMeals = Object.keys(MEALS).filter((meal) =>
    orders.some((order) => order.meals?.includes(meal))
  );
  const widths = [
    24,
    16,
    ...(options.includeNotes ? [35] : []),
    267 - 24 - 16 - (options.includeNotes ? 35 : 0) - Math.max(activeMeals.length, 1) * 21 - 25,
    ...Array(Math.max(activeMeals.length, 1)).fill(21),
    25,
  ] as number[];
  const xs = widths.reduce<number[]>((acc, w) => [...acc, acc[acc.length - 1] + w], [15]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const recipientLines = [
    options.recipient.company,
    options.recipient.address,
    options.recipient.email,
  ].flatMap((v) => doc.splitTextToSize(v, 257) as string[]);
  const recipientHeight = 9 + recipientLines.length * 3.8,
    tableY = 40 + recipientHeight + 4;
  if (tableY > 105) throw new Error('Alamat bil terlalu panjang / Billing address is too long.');
  doc.setFontSize(8);
  const rows = orders.map((order) => {
    const cells = [
      invoiceDate(order.eventDate || order.date || order.dateTime),
      String(order.quantity ?? order.guests ?? 0),
      ...(options.includeNotes ? [order.notes || '-'] : []),
      order.menu || 'Set Box',
      ...(activeMeals.length
        ? activeMeals.map((meal) =>
            order.meals?.includes(meal) && order.prices?.[meal] != null
              ? Number(order.prices[meal]).toFixed(2)
              : '-'
          )
        : ['-']),
      (invoiceAmountCents(order) / 100).toFixed(2),
    ];
    const lines = cells.map((v, i) => doc.splitTextToSize(v, widths[i] - 4) as string[]),
      height = Math.max(8, Math.max(...lines.map((v) => v.length)) * lineHeight + 3.6);
    if (height > rowsBottom - tableY - 14)
      throw new Error(
        'Catatan/menu terlalu panjang untuk satu halaman. Cuba tanpa catatan / Notes or menu exceed one page; try without notes.'
      );
    return { order, lines, height };
  });
  return { activeMeals, widths, xs, recipientLines, recipientHeight, tableY, rows };
}
export function planInvoicePages(
  orders: InvoiceRecord[],
  options: BatchPdfOptions
): Array<Omit<InvoicePage, 'invoiceNo'>> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }),
    data = layout(doc, orders, options),
    pages: Array<Omit<InvoicePage, 'invoiceNo'>> = [];
  let page = { orderIds: [] as string[], totalCents: 0 },
    y = data.tableY + 14;
  for (const row of data.rows) {
    if (!row.order.id) throw new Error('Order ID required.');
    if (page.orderIds.length && y + row.height > rowsBottom) {
      pages.push(page);
      page = { orderIds: [], totalCents: 0 };
      y = data.tableY + 14;
    }
    page.orderIds.push(row.order.id);
    page.totalCents += invoiceAmountCents(row.order);
    y += row.height;
  }
  if (page.orderIds.length) pages.push(page);
  return pages;
}
export function renderInvoiceBatch(orders: InvoiceRecord[], options: BatchPdfOptions): jsPDF {
  const pages = options.pages;
  if (!pages?.length || !orders.length) throw new Error('Saved invoice page numbers are required.');
  if (new Set(pages.map((p) => p.invoiceNo)).size !== pages.length)
    throw new Error('Each page needs a distinct invoice number.');
  if (
    JSON.stringify(pages.flatMap((p) => p.orderIds).sort()) !==
    JSON.stringify(orders.map((o) => o.id).sort())
  )
    throw new Error('Saved invoice selection mismatch.');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setCreationDate(new Date(options.issuedAt));
  doc.setProperties({ title: 'Invoice - Restoran Wawasan', author: 'Restoran Wawasan' });
  const data = layout(doc, orders, options),
    bm = options.lang === 'bm';
  pages.forEach((page, index) => {
    if (index) doc.addPage();
    const rows = page.orderIds.map((id) => data.rows.find((row) => row.order.id === id)!);
    if (rows.reduce((sum, row) => sum + invoiceAmountCents(row.order), 0) !== page.totalCents)
      throw new Error('Saved invoice total mismatch.');
    if (data.tableY + 14 + rows.reduce((sum, row) => sum + row.height, 0) > rowsBottom + 0.01)
      throw new Error('Saved rows exceed the page.');
    drawInvoiceCalligraphy(doc, options.calligraphy || null, 36, 297);
    // A compressed document otherwise selects jsPDF's CPU-heavy SLOW PNG mode.
    // FAST remains lossless and keeps high-resolution logos practical to render.
    if (options.logo) doc.addImage(options.logo, 'PNG', 15, 8, 20, 20, 'invoice-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(114, 80, 20);
    doc.text('RESTORAN WAWASAN', 39, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(45, 38, 30);
    doc.text(INVOICE_CONTACT.address, 39, 23);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(23);
    doc.setTextColor(114, 80, 20);
    doc.text(bm ? 'INVOIS' : 'INVOICE', 282, 19, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(45, 38, 30);
    doc.text(`${bm ? 'No. Invois' : 'Invoice No'}: ${page.invoiceNo}`, 282, 26, { align: 'right' });
    doc.text(`${bm ? 'Tarikh' : 'Date'}: ${invoiceDate(options.issuedAt)}`, 282, 31, {
      align: 'right',
    });
    doc.setFillColor(253, 252, 250);
    doc.setDrawColor(222, 211, 193);
    doc.roundedRect(15, 40, 267, data.recipientHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(bm ? 'KEPADA' : 'BILL TO', 19, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(data.recipientLines, 19, 50, { lineHeightFactor: 1.27 });
    let y = data.tableY;
    doc.setFillColor(166, 124, 30);
    doc.rect(15, y, 267, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(bm ? 'BUTIRAN PESANAN' : 'ORDER DETAILS', 19, y + 4.8);
    doc.text(
      bm ? 'HARGA / PAX (RM)' : 'PRICE / PAX (RM)',
      data.xs[data.xs.length - 2] - 3,
      y + 4.8,
      { align: 'right' }
    );
    doc.text(bm ? 'JUMLAH' : 'TOTAL', 269.5, y + 4.8, { align: 'center' });
    y += 7;
    doc.setFillColor(114, 80, 20);
    doc.rect(15, y, 267, 7, 'F');
    const labels = [
      bm ? 'Tarikh' : 'Date',
      bm ? 'Pax' : 'QTY',
      ...(options.includeNotes ? [bm ? 'Catatan' : 'Notes'] : []),
      'Menu',
      ...(data.activeMeals.length
        ? data.activeMeals.map((meal) => MEALS[meal][bm ? 0 : 1])
        : ['-']),
      'RM',
    ];
    labels.forEach((v, i) => {
      doc.setFontSize(7);
      doc.text(v, data.xs[i] + data.widths[i] / 2, y + 4.8, { align: 'center' });
    });
    y += 7;
    rows.forEach((row, i) => {
      doc.setFillColor(
        ...((i % 2 ? [250, 248, 244] : [255, 255, 255]) as [number, number, number])
      );
      doc.rect(15, y, 267, row.height, 'F');
      doc.setDrawColor(208, 189, 151);
      doc.setLineWidth(0.2);
      doc.rect(15, y, 267, row.height);
      data.xs.slice(1, -1).forEach((x) => doc.line(x, y, x, y + row.height));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(35, 30, 25);
      row.lines.forEach((v, c) =>
        doc.text(v, c === data.widths.length - 1 ? data.xs[c + 1] - 2 : data.xs[c] + 2, y + 5, {
          align: c === data.widths.length - 1 ? 'right' : 'left',
          lineHeightFactor: 1.35,
        })
      );
      y += row.height;
    });
    doc.setFillColor(114, 80, 20);
    doc.rect(15, y, 267, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(bm ? 'JUMLAH INVOIS INI' : 'THIS INVOICE TOTAL', 19, y + 6);
    doc.text(`RM ${(page.totalCents / 100).toFixed(2)}`, 279, y + 6, { align: 'right' });
    doc.setTextColor(80, 66, 45);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const words = numberToWords(page.totalCents / 100, options.lang);
    doc.text(words, 15, 172);
    drawInvoiceBankDetails(doc, options.bank || INVOICE_BUSINESS.bank, options.lang);
    drawInvoiceContactLinks(doc, 197, 297);
    doc.setDrawColor(194, 147, 45);
    doc.line(15, 201, 282, 201);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 110, 95);
    doc.text(INVOICE_CONTACT.address, 15, 206);
    doc.link(15, 202.5, 210, 5, { url: INVOICE_CONTACT.maps });
    doc.text(`${bm ? 'Halaman' : 'Page'} ${index + 1} / ${pages.length}`, 282, 206, {
      align: 'right',
    });
  });
  return doc;
}
