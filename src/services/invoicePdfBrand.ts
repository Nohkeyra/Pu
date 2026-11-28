import { INVOICE_BUSINESS } from '../constants/invoiceBusiness';
import type { jsPDF } from 'jspdf';
export const INVOICE_CONTACT = {
  phone: '017 315 7721',
  whatsapp: 'https://wa.me/60173157721',
  email: 'wawasan.orders@gmail.com',
  address: INVOICE_BUSINESS.address,
  maps: 'https://www.google.com/maps/search/?api=1&query=Restoran%20Wawasan%20Menara%20PjH%20Putrajaya',
};
export function drawInvoiceContactLinks(doc: jsPDF, y: number, width = 210): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(114, 80, 20);
  const a = doc.getTextWidth(INVOICE_CONTACT.phone),
    b = doc.getTextWidth(INVOICE_CONTACT.email),
    x = (width - a - b - 8) / 2;
  doc.textWithLink(INVOICE_CONTACT.phone, x, y, { url: INVOICE_CONTACT.whatsapp });
  doc.textWithLink(INVOICE_CONTACT.email, x + a + 8, y, { url: `mailto:${INVOICE_CONTACT.email}` });
}

/** Full, readable banking block without changing saved invoice row pagination. */
export function drawInvoiceBankDetails(
  doc: jsPDF,
  bank: typeof INVOICE_BUSINESS.bank,
  lang: 'bm' | 'en',
  y = 175
): void {
  doc.setFillColor(253, 252, 250);
  doc.setDrawColor(194, 147, 45);
  doc.setLineWidth(0.25);
  doc.roundedRect(15, y, 267, 18, 2, 2, 'FD');
  doc.setTextColor(114, 80, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('MAKLUMAT AKAUN BANK / BANK ACCOUNT DETAILS', 19, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    lang === 'bm' ? 'Disediakan oleh: Restoran Wawasan' : 'Prepared by: Restoran Wawasan',
    278,
    y + 4,
    { align: 'right' }
  );
  const xs = [19, 115, 205],
    labels =
      lang === 'bm' ? ['Nama Akaun', 'Bank', 'No. Akaun'] : ['Account Name', 'Bank', 'Account No.'];
  doc.setTextColor(105, 95, 85);
  doc.setFontSize(7.5);
  labels.forEach((label, index) => doc.text(label, xs[index], y + 8));
  doc.setTextColor(26, 24, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  [bank.bankAccountName, bank.bankName, bank.bankAccountNumber].forEach((value, index) =>
    doc.text(value, xs[index], y + 12)
  );
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(105, 95, 85);
  doc.text(INVOICE_BUSINESS.pricingNote[lang], 19, y + 16);
  doc.text(INVOICE_BUSINESS.generatedNote[lang], 278, y + 16, { align: 'right' });
}
