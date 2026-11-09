import type { ConsolidatedInvoicePayload } from '@/types';
import { validateInvoiceGroup } from '../lib/invoiceBatch';
import { renderInvoiceBatch } from './invoiceBatchPdf';
/** Only render saved, server-allocated pages. Never invent official numbers in the browser. */
export const generateConsolidatedInvoicePDF = (
  payload: ConsolidatedInvoicePayload,
  isFinal = true
) => {
  if (!isFinal) throw new Error('Use an individual quotation for unconfirmed orders.');
  const recipient = validateInvoiceGroup(payload.orders, payload.recipient?.address);
  if (!payload.pages || !payload.issuedAt)
    throw new Error('Saved invoice page numbers and issue date are required.');
  return renderInvoiceBatch(payload.orders, {
    ...payload,
    pages: payload.pages,
    issuedAt: payload.issuedAt,
    recipient,
    includeNotes: payload.includeNotes,
    lang: payload.lang === 'en' ? 'en' : 'bm',
  });
};
