import { jsPDF } from 'jspdf';
import { planRefinedBatch } from './refinedInvoiceBatch';
import type { InvoiceRecord, InvoicePage, InvoiceRecipient } from '../lib/invoiceBatch';

/** One shared planner for admin review and server issuance. */
export interface BatchPdfOptions {
  layoutVersion?: 4;
  includeNotes: boolean;
  lang: 'bm' | 'en';
  recipient: InvoiceRecipient;
  issuedAt: string;
  pages?: InvoicePage[];
  bank?: { bankName: string; bankAccountName: string; bankAccountNumber: string };
}

export function planInvoicePages(
  orders: InvoiceRecord[],
  options: BatchPdfOptions
): Array<Omit<InvoicePage, 'invoiceNo'>> {
  return planRefinedBatch(new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),orders,options);
}
