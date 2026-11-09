import { INVOICE_CONTACT } from '../../src/services/invoicePdfBrand.js';
export interface InvoiceEmailDetails {
  company: string;
  invoiceNumbers: string[];
  total: number;
  lang: 'bm' | 'en';
}
export const INVOICE_EMAIL_NOTE =
  'Sila abaikan emel ini jika pembayaran telah dibuat.\nJika terdapat sebarang kesilapan, pembatalan atau pertukaran kuantiti, sila maklumkan melalui WhatsApp ke 017 315 7721.';
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  );
export function invoiceEmailTemplate(details: InvoiceEmailDetails) {
  const bm = details.lang === 'bm',
    numbers = details.invoiceNumbers.join(', '),
    subject = `[Restoran Wawasan] ${bm ? 'Invois' : 'Invoice'} ${numbers}`;
  const greeting = bm ? `Salam hormat ${details.company},` : `Dear ${details.company},`,
    message = bm
      ? 'Bersama emel ini dilampirkan invois untuk semakan pihak tuan/puan.'
      : 'Please find your invoice attached for your review.',
    thanks = bm
      ? 'Terima kasih atas kepercayaan anda kepada Restoran Wawasan.'
      : 'Thank you for choosing Restoran Wawasan.',
    amount = `RM ${details.total.toFixed(2)}`;
  const text = `${greeting}\n\n${message}\n\n${bm ? 'No. invois' : 'Invoice no.'}: ${numbers}\n${bm ? 'Jumlah lampiran' : 'Attachment total'}: ${amount}\n\n${thanks}\n\nRestoran Wawasan\n${INVOICE_CONTACT.address}\n${INVOICE_CONTACT.phone}\n${INVOICE_CONTACT.email}\n\nNota:\n${INVOICE_EMAIL_NOTE}`;
  const html = `<!doctype html><html lang="${bm ? 'ms' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f5f1e9;color:#30291f;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fffdf8;border:1px solid #dfd1b8;border-radius:16px;overflow:hidden"><tr><td style="padding:30px 28px;background:#30271d;border-bottom:4px solid #c2932d"><p style="margin:0;color:#e3c881;letter-spacing:3px;font-size:11px">DARI WAWASAN, DENGAN IKHLAS</p><h1 style="margin:10px 0 0;color:#fff9e9;font-family:Georgia,serif;font-size:26px">Restoran Wawasan</h1></td></tr><tr><td style="padding:28px"><p>${escape(greeting)}</p><p style="line-height:1.7">${message}</p><table role="presentation" width="100%" cellpadding="16" style="background:#f7f1e5;border:1px solid #e6d6b9;border-radius:8px"><tr><td><p style="margin:0 0 8px;color:#725014;font-size:12px">${bm ? 'NO. INVOIS' : 'INVOICE NO.'}</p><p style="margin:0;line-height:1.6">${escape(numbers)}</p></td></tr><tr><td style="border-top:1px solid #e6d6b9"><span style="font-size:12px">${bm ? 'JUMLAH LAMPIRAN' : 'ATTACHMENT TOTAL'}</span><p style="margin:8px 0 0;font-size:28px;font-weight:bold;color:#725014">${amount}</p></td></tr></table><p style="line-height:1.7">${thanks}</p><p style="margin:24px 0 8px;font-weight:bold;color:#725014">Nota:</p><p style="margin:0;font-size:13px;line-height:1.7;color:#65594a">${escape(INVOICE_EMAIL_NOTE).replace(/\n/g, '<br>')}</p></td></tr><tr><td style="padding:20px 28px;background:#eee5d5;font-size:12px;line-height:1.7">${INVOICE_CONTACT.address}<br><a href="${INVOICE_CONTACT.whatsapp}" style="color:#725014">${INVOICE_CONTACT.phone}</a> &nbsp;·&nbsp; <a href="mailto:${INVOICE_CONTACT.email}" style="color:#725014">${INVOICE_CONTACT.email}</a></td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
