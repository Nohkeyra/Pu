import { INVOICE_BUSINESS } from '../constants/invoiceBusiness';
import type { jsPDF } from 'jspdf';
export const INVOICE_CONTACT = {
  phone: '017 315 7721',
  whatsapp: 'https://wa.me/60173157721',
  email: 'wawasan.orders@gmail.com',
  address: INVOICE_BUSINESS.address,
  maps: 'https://www.google.com/maps/search/?api=1&query=Restoran%20Wawasan%20Menara%20PjH%20Putrajaya',
};
const registered = new WeakSet<jsPDF>();
type PdfInternal = {
  newObject: () => number;
  write: (...args: string[]) => void;
  events: { subscribe: (event: string, callback: () => void) => void };
};
/** Native PDF Screen blend, followed by a gradual white fade. */
export function drawInvoiceCalligraphy(
  doc: jsPDF,
  image: string | null,
  height = 36,
  width = 210
): void {
  const internal = doc.internal as unknown as PdfInternal;
  if (image && !registered.has(doc)) {
    let id = 0;
    internal.events.subscribe('putResources', () => {
      id = internal.newObject();
      internal.write('<< /Type /ExtGState /BM /Screen >>', 'endobj');
    });
    internal.events.subscribe('putGStateDict', () => internal.write(`/RWHeaderScreen ${id} 0 R`));
    registered.add(doc);
  }
  doc.saveGraphicsState();
  doc.setFillColor(252, 249, 242);
  doc.rect(0, 0, width, height, 'F');
  if (image) {
    doc.rect(0, 0, width, height, null).clip().discardPath();
    const imageHeight = (width * 872) / 1600;
    doc.addImage(
      image,
      'JPEG',
      0,
      (height - imageHeight) / 2,
      width,
      imageHeight,
      'invoice-calligraphy',
      'MEDIUM'
    );
    internal.write('/RWHeaderScreen gs');
    doc.setFillColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.66 }));
    doc.rect(0, 0, width, height, 'F');
    const start = height * 0.45,
      steps = 50;
    for (let step = 0; step < steps; step++) {
      doc.setGState(doc.GState({ opacity: (step + 1) / steps }));
      doc.rect(
        0,
        start + (step * (height - start)) / steps,
        width,
        (height - start) / steps + 0.02,
        'F'
      );
    }
  }
  doc.restoreGraphicsState();
  doc.setDrawColor(194, 147, 45);
  doc.setLineWidth(0.35);
  doc.line(15, height, width - 15, height);
  doc.link(39, 19, width > 220 ? 160 : 82, 13, { url: INVOICE_CONTACT.maps });
}
export function drawInvoiceContactLinks(doc: jsPDF, y: number, width = 210): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
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
  doc.setFontSize(7.5);
  doc.text('MAKLUMAT AKAUN BANK / BANK ACCOUNT DETAILS', 19, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
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
  doc.setFontSize(7);
  labels.forEach((label, index) => doc.text(label, xs[index], y + 8));
  doc.setTextColor(26, 24, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  [bank.bankAccountName, bank.bankName, bank.bankAccountNumber].forEach((value, index) =>
    doc.text(value, xs[index], y + 12)
  );
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(105, 95, 85);
  doc.text(INVOICE_BUSINESS.pricingNote[lang], 19, y + 16);
  doc.text(INVOICE_BUSINESS.generatedNote[lang], 278, y + 16, { align: 'right' });
}
