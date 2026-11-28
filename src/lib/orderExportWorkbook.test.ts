import { describe, it, expect } from 'vitest';
import { generateOrdersWorkbook, generateOrdersCSV, mapOrderExportRow } from './orderExportWorkbook';

describe('canonical order export', () => {
  const order = {
    id: 'full-firestore-order-id-123456789', company: 'Sample Company',
    division: 'Finance', customerName: 'Sample Customer', customerEmail: 'customer@example.invalid',
    phone: '0123456789', eventDate: '2026-12-06', dateTime: '2026-12-05T17:30:00Z',
    guests: 20, meals: ['lunch'], preparationType: 'buffet', prices: { lunch: 9 },
    totalAmount: 180, status: 'billed', invoiceNo: 'RW00001', menu: 'Soto', notes: 'No onions',
  };
  it('retains full identifiers, legacy aliases and Malaysia event time', () => {
    expect(mapOrderExportRow(order)).toMatchObject({
      orderId: order.id, clientCompany: order.company, department: 'Finance',
      contactName: order.customerName, contactEmail: order.customerEmail,
      contactPhone: order.phone, paxCount: 20, eventDate: '2026-12-06',
      eventTime: '01:30', invoiceNo: 'RW00001', totalAmount: 180,
    });
    expect(mapOrderExportRow({ ...order, time: '11:00' }).eventTime).toBe('11:00');
  });
  it('keeps all fields from both standard exports in an actual XLSX workbook', async () => {
    const workbook = await generateOrdersWorkbook([order]);
    const sheet = workbook.worksheets[0];
    expect(sheet.columnCount).toBe(20);
    expect(sheet.getRow(2).getCell('orderId').value).toBe(order.id);
    expect(sheet.getRow(2).getCell('totalAmount').value).toBe(180);
    expect(sheet.getRow(2).getCell('unitPrices').value).toBe('lunch: RM 9.00');
    expect(sheet.getRow(2).getCell('menu').value).toBe('Soto');
    expect(sheet.getRow(2).getCell('notes').value).toBe('No onions');
    expect((await workbook.xlsx.writeBuffer()).byteLength).toBeGreaterThan(100);
  });
  it('keeps CSV formula escaping and canonical values', () => {
    const csv = generateOrdersCSV([{ ...order, company: '=1+1' }]);
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"RM 180.00"');
    expect(csv).toContain(order.id);
  });
});
