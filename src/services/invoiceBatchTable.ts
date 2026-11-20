import type { jsPDF } from 'jspdf';
import { invoiceAmountCents, invoiceDate, type InvoiceRecord, type InvoicePage } from '../lib/invoiceBatch';
import type { BatchPdfOptions } from './invoiceBatchPdf';
import { numberToWords } from './numberToWordsBM';
const MEAL_LABELS: Record<string, string> = {breakfast:'Breakfast',lunch:'Lunch',hi_tea:'Hi-Tea',dinner:'Dinner'};
const mealLabel = (key: string) => MEAL_LABELS[key] || key;
const MEAL_COLUMNS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'hi_tea', label: 'Hi-Tea' },
];
export function createInvoiceTableLayout(doc: jsPDF, orders: InvoiceRecord[], options: BatchPdfOptions) {
  const canonical = (meal: string) => ['tea_break', 'hi_tea_break'].includes(meal) ? 'hi_tea' : meal;
  const extra = [...new Set(orders.flatMap(order => order.meals || []).map(canonical))].filter(key => !MEAL_COLUMNS.some(meal => meal.key === key));
  const columns = [...MEAL_COLUMNS, ...extra.map(key => ({key, label: key === 'dinner' ? 'Dinner' : key}))];
  if (columns.length > 6) throw new Error('Too many meal types for the invoice table.');
  const activeMeals = columns.map(meal => meal.key);
  const widths = [24, 26, 10, 50, 35, ...Array(columns.length * 2).fill(48 / columns.length), 26];
  const xs = widths.reduce<number[]>((acc, width) => [...acc, acc[acc.length - 1] + width], [15]);
  if (Math.abs(xs[xs.length - 1] - 282) > 0.001) throw new Error('Invoice columns do not fit the original table');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const recipientLines = [options.recipient.company, options.recipient.address, options.recipient.email]
    .flatMap(value => doc.splitTextToSize(value, 257) as string[]);
  const recipientHeight = 10 + recipientLines.length * 4.5;
  const tableY = 40 + recipientHeight + 4;
  if (tableY > 105) throw new Error('Billing address is too long.');
  const BODY_PT = 9, NUM_PT = 8.5;
  const money = (value: number) => value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rows = orders.map(order => {
    const quantity = order.quantity ?? order.guests ?? 0;
    const selected = (key: string) => order.meals?.some(meal => canonical(meal) === key);
    const price = (key: string): number | null => {
      const keys = (order.meals || []).filter(meal => canonical(meal) === key);
      if (!keys.length || keys.some(meal => order.prices?.[meal] == null && order.prices?.[key] == null)) return null;
      return keys.reduce((sum, meal) => sum + Number(order.prices?.[meal] ?? order.prices?.[key]), 0);
    };
    const meals = columns.filter(meal => selected(meal.key));
    const cells = [
      invoiceDate(order.eventDate || order.date || order.dateTime),
      meals.map(meal => meal.label).join(' + ') || ' ',
      String(quantity),
      options.includeNotes ? order.notes || ' ' : ' ',
      order.menu || ' ',
      ...columns.map(meal => price(meal.key) != null ? money(price(meal.key)!) : '-'),
      ...columns.map(meal => price(meal.key) != null ? money(Math.round(price(meal.key)! * quantity * 100) / 100) : '-'),
      money(invoiceAmountCents(order) / 100),
    ];
    const lines = cells.map((value, column) => { doc.setFontSize(column >= 5 ? NUM_PT : BODY_PT); return doc.splitTextToSize(value, widths[column] - 3) as string[]; });
    const height = Math.max(9, Math.max(...lines.map(line => line.length)) * 3.9 + 3.5);
    if (height > 135 - tableY - 14) throw new Error('Notes or menu exceed one page; try without notes.');
    return { order, lines, height };
  });
  return { activeMeals, widths, xs, recipientLines, recipientHeight, tableY, rows };
}

export function drawInvoiceTable(doc: jsPDF, data: ReturnType<typeof createInvoiceTableLayout>, rows: ReturnType<typeof createInvoiceTableLayout>['rows'], page: InvoicePage, options: BatchPdfOptions) {
    const n = data.activeMeals.length;
    let y = data.tableY;
    const groups = [
      { start: 0, end: 5, title: 'ORDER DETAILS' },
      { start: 5, end: 5 + n, title: 'PRICE PER UNIT (RM)' },
      { start: 5 + n, end: 5 + 2 * n, title: 'TOTAL (RM)' },
      { start: 5 + 2 * n, end: 6 + 2 * n, title: 'DAY TOTAL' },
    ];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    groups.forEach(group => {
      const left = data.xs[group.start], width = data.xs[group.end] - left;
      doc.setFillColor(166, 124, 30);
      doc.setDrawColor(222, 211, 193);
      doc.rect(left, y, width, 7, 'FD');
      doc.text(group.title, left + width / 2, y + 4.7, { align: 'center' });
    });
    y += 7;
    const labels = ['Date', 'For', 'QTY', 'Notes', 'Menu', ...data.activeMeals.map(mealLabel), ...data.activeMeals.map(mealLabel), 'RM'];
    labels.forEach((label, column) => {
      doc.setFillColor(114, 80, 20);
      doc.rect(data.xs[column], y, data.widths[column], 7, 'FD');
      doc.setFontSize(8);
      doc.text(label, data.xs[column] + data.widths[column] / 2, y + 4.7, { align: 'center' });
    });
    y += 7;
    rows.forEach((row, rowIndex) => {
      doc.setFillColor(...(rowIndex % 2 ? [250, 248, 244] : [255, 255, 255]) as [number, number, number]);
      doc.setDrawColor(208, 189, 151);
      doc.setLineWidth(0.2);
      doc.rect(15, y, 267, row.height, 'FD');
      data.xs.slice(1, -1).forEach(x => doc.line(x, y, x, y + row.height));
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(35, 30, 25);
      row.lines.forEach((lines, column) => {
        const numeric = column >= 5;
        doc.setFontSize(numeric ? 8.5 : 9);
        const center = column === 2;
        const x = numeric ? data.xs[column + 1] - 1.5 : center ? data.xs[column] + data.widths[column] / 2 : data.xs[column] + 1.5;
        doc.text(lines, x, y + 4.6, { align: numeric ? 'right' : center ? 'center' : 'left', lineHeightFactor: 1.15 });
      });
      y += row.height;
    });
    const words = numberToWords(page.totalCents / 100, options.lang);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const wordLines = doc.splitTextToSize(words, data.xs[5 + n] - 15 - 4) as string[];
    const totalHeight = Math.max(10, wordLines.length * 3.4 + 4.5);
    doc.setFillColor(114, 80, 20);
    doc.setDrawColor(208, 189, 151);
    doc.rect(15, y, 267, totalHeight, 'FD');
    doc.line(data.xs[5 + n], y, data.xs[5 + n], y + totalHeight);
    doc.line(data.xs[5 + 2 * n], y, data.xs[5 + 2 * n], y + totalHeight);
    doc.setTextColor(255, 255, 255);
    doc.text(wordLines, 17, y + 4.8, { lineHeightFactor: 1.15 });
    doc.setFontSize(9);
    doc.text('TOTAL AMOUNT (RM)', (data.xs[5 + n] + data.xs[5 + 2 * n]) / 2, y + totalHeight / 2 + 1.2, { align: 'center' });
    doc.text((page.totalCents / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 280, y + totalHeight / 2 + 1.2, { align: 'right' });
    if (y + totalHeight > 147) throw new Error('Invoice table exceeds its reserved area');

}
